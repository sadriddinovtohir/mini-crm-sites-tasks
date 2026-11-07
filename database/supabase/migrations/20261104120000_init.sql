create schema if not exists private;

revoke all on schema private from public;
grant usage on schema private to authenticated;
grant usage on schema private to supabase_auth_admin;

create type public.user_role as enum ('manager', 'executor');

create type public.task_status as enum (
  'new',
  'in_progress',
  'review',
  'accepted',
  'rework'
);

create table public.profiles (
  id         uuid primary key
             constraint profiles_id_fkey references auth.users (id) on delete cascade,
  full_name  text not null,
  role       public.user_role not null default 'executor',
  created_at timestamptz not null default now()
);

create table public.sites (
  id         uuid primary key default gen_random_uuid(),
  name       text not null check (btrim(name) <> ''),
  address    text not null check (btrim(address) <> ''),
  created_by uuid not null default auth.uid()
             constraint sites_created_by_fkey references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.tasks (
  id          uuid primary key default gen_random_uuid(),
  site_id     uuid not null
              constraint tasks_site_id_fkey references public.sites (id) on delete restrict,
  title       text not null check (btrim(title) <> ''),
  description text,
  assignee_id uuid not null
              constraint tasks_assignee_id_fkey references public.profiles (id),
  status      public.task_status not null default 'new',
  created_by  uuid not null default auth.uid()
              constraint tasks_created_by_fkey references public.profiles (id),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table public.task_status_history (
  id          bigint generated always as identity primary key,
  task_id     uuid not null
              constraint task_status_history_task_id_fkey references public.tasks (id) on delete cascade,
  from_status public.task_status,
  to_status   public.task_status not null,
  changed_by  uuid not null
              constraint task_status_history_changed_by_fkey references public.profiles (id),
  comment     text check (comment is null or char_length(comment) <= 2000),
  created_at  timestamptz not null default now()
);

create index tasks_site_id_idx               on public.tasks (site_id);
create index tasks_assignee_id_idx           on public.tasks (assignee_id);
create index task_status_history_task_id_idx on public.task_status_history (task_id);

create or replace function private.is_manager()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'manager'
  );
$$;

create or replace function private.status_label(p_status public.task_status)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_status
    when 'new'         then 'Новая'
    when 'in_progress' then 'В работе'
    when 'review'      then 'На проверке'
    when 'accepted'    then 'Принята'
    when 'rework'      then 'На доработке'
  end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name, role)
  values (
    new.id,
    coalesce(
      nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Пользователь'
    ),
    'executor'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

create or replace function private.tasks_check_assignee()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' or new.assignee_id is distinct from old.assignee_id then
    if not exists (
      select 1
      from public.profiles p
      where p.id = new.assignee_id
        and p.role = 'executor'
    ) then
      raise exception 'Исполнителем можно назначить только пользователя с ролью «Исполнитель»'
        using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create or replace function private.tasks_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.status = 'accepted' then
    raise exception 'Задача уже принята — изменять её нельзя'
      using errcode = '55000';
  end if;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.tasks_after_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.task_status_history (task_id, from_status, to_status, changed_by)
  values (new.id, null, new.status, new.created_by);
  return null;
end;
$$;

create trigger tasks_10_lock_accepted
  before update on public.tasks
  for each row execute function private.tasks_before_update();

create trigger tasks_20_check_assignee
  before insert or update on public.tasks
  for each row execute function private.tasks_check_assignee();

create trigger tasks_30_history_on_insert
  after insert on public.tasks
  for each row execute function private.tasks_after_insert();

create or replace function public.change_task_status(
  p_task_id uuid,
  p_to      public.task_status,
  p_comment text default null
)
returns public.tasks
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid        uuid := auth.uid();
  v_is_manager boolean;
  v_task       public.tasks;
  v_from       public.task_status;
  v_comment    text := nullif(btrim(coalesce(p_comment, '')), '');
begin
  if v_uid is null then
    raise exception 'Необходимо войти в систему'
      using errcode = '28000';
  end if;

  if p_task_id is null or p_to is null then
    raise exception 'Не указана задача или новый статус'
      using errcode = '22004';
  end if;

  v_is_manager := private.is_manager();

  select t.*
    into v_task
    from public.tasks t
   where t.id = p_task_id
     and (v_is_manager or t.assignee_id = v_uid)
   for update;

  if not found then
    raise exception 'Задача не найдена'
      using errcode = 'P0002';
  end if;

  v_from := v_task.status;

  if v_comment is not null and char_length(v_comment) > 2000 then
    raise exception 'Комментарий слишком длинный (максимум 2000 символов)'
      using errcode = '22001';
  end if;

  if (v_from = 'new'         and p_to = 'in_progress')
  or (v_from = 'in_progress' and p_to = 'review')
  or (v_from = 'rework'      and p_to = 'in_progress') then
    if v_task.assignee_id <> v_uid then
      raise exception 'Это действие может выполнить только назначенный исполнитель'
        using errcode = '42501';
    end if;

  elsif v_from = 'review' and p_to in ('accepted', 'rework') then
    if not v_is_manager then
      raise exception 'Это действие может выполнить только постановщик'
        using errcode = '42501';
    end if;
    if p_to = 'rework' and v_comment is null then
      raise exception 'При возврате на доработку комментарий обязателен'
        using errcode = '22023';
    end if;

  else
    raise exception 'Недопустимый переход статуса: «%» → «%»',
      private.status_label(v_from), private.status_label(p_to)
      using errcode = '22023';
  end if;

  update public.tasks
     set status = p_to
   where id = p_task_id
  returning * into v_task;

  insert into public.task_status_history (task_id, from_status, to_status, changed_by, comment)
  values (p_task_id, v_from, p_to, v_uid, v_comment);

  return v_task;
end;
$$;

revoke all on all functions in schema private from public, anon, authenticated;
grant execute on function private.is_manager() to authenticated;

revoke all on function public.change_task_status(uuid, public.task_status, text) from public, anon;
grant execute on function public.change_task_status(uuid, public.task_status, text) to authenticated;

alter table public.profiles            enable row level security;
alter table public.sites               enable row level security;
alter table public.tasks               enable row level security;
alter table public.task_status_history enable row level security;

create policy profiles_select on public.profiles
  for select to authenticated
  using (true);

create policy sites_select on public.sites
  for select to authenticated
  using (
    (select private.is_manager())
    or exists (
      select 1
      from public.tasks t
      where t.site_id = sites.id
        and t.assignee_id = (select auth.uid())
    )
  );

create policy sites_insert on public.sites
  for insert to authenticated
  with check ((select private.is_manager()));

create policy sites_update on public.sites
  for update to authenticated
  using ((select private.is_manager()))
  with check ((select private.is_manager()));

create policy sites_delete on public.sites
  for delete to authenticated
  using ((select private.is_manager()));

create policy tasks_select on public.tasks
  for select to authenticated
  using (
    (select private.is_manager())
    or assignee_id = (select auth.uid())
  );

create policy tasks_insert on public.tasks
  for insert to authenticated
  with check ((select private.is_manager()));

create policy tasks_update on public.tasks
  for update to authenticated
  using ((select private.is_manager()))
  with check ((select private.is_manager()));

create policy tasks_delete on public.tasks
  for delete to authenticated
  using ((select private.is_manager()));

create policy task_status_history_select on public.task_status_history
  for select to authenticated
  using (
    exists (
      select 1
      from public.tasks t
      where t.id = task_status_history.task_id
    )
  );

revoke all on public.profiles, public.sites, public.tasks, public.task_status_history
  from anon, authenticated;

grant select on public.profiles, public.sites, public.tasks, public.task_status_history
  to authenticated;

grant insert (name, address),
      update (name, address),
      delete
  on public.sites to authenticated;

grant insert (site_id, title, description, assignee_id),
      update (site_id, title, description, assignee_id),
      delete
  on public.tasks to authenticated;
