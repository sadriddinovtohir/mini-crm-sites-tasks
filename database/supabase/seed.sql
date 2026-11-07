create or replace function pg_temp.seed_move(
  p_task    uuid,
  p_to      public.task_status,
  p_by      uuid,
  p_at      timestamptz,
  p_comment text default null
) returns void
language plpgsql
as $$
declare
  v_from public.task_status;
begin
  select status into v_from from public.tasks where id = p_task;

  update public.tasks set status = p_to where id = p_task;

  insert into public.task_status_history (task_id, from_status, to_status, changed_by, comment, created_at)
  values (p_task, v_from, p_to, p_by, p_comment, p_at);
end;
$$;

create or replace function pg_temp.seed_task(
  p_site     uuid,
  p_title    text,
  p_desc     text,
  p_assignee uuid,
  p_author   uuid,
  p_at       timestamptz
) returns uuid
language plpgsql
as $$
declare
  v_id uuid;
begin
  insert into public.tasks (site_id, title, description, assignee_id, created_by, created_at)
  values (p_site, p_title, p_desc, p_assignee, p_author, p_at)
  returning id into v_id;

  update public.task_status_history
     set created_at = p_at
   where task_id = v_id and from_status is null;

  return v_id;
end;
$$;

do $$
declare
  m  uuid;
  e1 uuid;
  e2 uuid;
  s1 uuid;
  s2 uuid;
  s3 uuid;
  t  uuid;
  d  timestamptz := date_trunc('day', now()) - interval '10 days' + interval '9 hours';
begin
  select p.id into m  from public.profiles p join auth.users u on u.id = p.id
   where u.email = 'manager@test.ru' and p.role = 'manager';
  select p.id into e1 from public.profiles p join auth.users u on u.id = p.id
   where u.email = 'executor1@test.ru' and p.role = 'executor';
  select p.id into e2 from public.profiles p join auth.users u on u.id = p.id
   where u.email = 'executor2@test.ru' and p.role = 'executor';

  if m is null or e1 is null or e2 is null then
    raise exception 'Сначала создайте пользователей manager@test.ru, executor1@test.ru, executor2@test.ru и выполните roles.sql';
  end if;

  delete from public.tasks;
  delete from public.sites;

  insert into public.sites (name, address, created_by, created_at)
  values ('ЖК «Северный»', 'г. Москва, ул. Северная, 12', m, d)
  returning id into s1;

  insert into public.sites (name, address, created_by, created_at)
  values ('Склад на Промышленной', 'г. Москва, ул. Промышленная, 5, стр. 2', m, d)
  returning id into s2;

  insert into public.sites (name, address, created_by, created_at)
  values ('Офис на Ленина', 'г. Москва, пр-т Ленина, 40', m, d)
  returning id into s3;

  t := pg_temp.seed_task(s1, 'Разметка осей фундамента', 'Вынести оси по проекту, секция А.', e1, m, d + interval '1 day');

  t := pg_temp.seed_task(s1, 'Армирование плиты перекрытия 2 этажа', 'Арматура А500, шаг 200 мм.', e1, m, d + interval '1 day');
  perform pg_temp.seed_move(t, 'in_progress', e1, d + interval '2 days');

  t := pg_temp.seed_task(s1, 'Монтаж опалубки колонн', null, e2, m, d + interval '2 days');
  perform pg_temp.seed_move(t, 'in_progress', e2, d + interval '3 days');
  perform pg_temp.seed_move(t, 'review',      e2, d + interval '5 days', 'Опалубка установлена, прошу проверить.');

  t := pg_temp.seed_task(s2, 'Устройство бетонного пола', 'Площадь 600 м², толщина 150 мм.', e1, m, d + interval '2 days');
  perform pg_temp.seed_move(t, 'in_progress', e1, d + interval '3 days');
  perform pg_temp.seed_move(t, 'review',      e1, d + interval '6 days');
  perform pg_temp.seed_move(t, 'rework',      m,  d + interval '7 days', 'Перепад высот больше 5 мм в осях 3–4. Нужно отшлифовать.');

  t := pg_temp.seed_task(s2, 'Монтаж ворот склада', 'Секционные ворота 4×4 м, 2 шт.', e2, m, d + interval '1 day');
  perform pg_temp.seed_move(t, 'in_progress', e2, d + interval '2 days');
  perform pg_temp.seed_move(t, 'review',      e2, d + interval '4 days');
  perform pg_temp.seed_move(t, 'accepted',    m,  d + interval '5 days', 'Принято, замечаний нет.');

  t := pg_temp.seed_task(s2, 'Прокладка кабеля освещения', null, e2, m, d + interval '3 days');
  perform pg_temp.seed_move(t, 'in_progress', e2, d + interval '4 days');
  perform pg_temp.seed_move(t, 'review',      e2, d + interval '6 days');
  perform pg_temp.seed_move(t, 'rework',      m,  d + interval '7 days', 'Кабель не закреплён в лотке на участке у ворот.');
  perform pg_temp.seed_move(t, 'in_progress', e2, d + interval '8 days', 'Исправляю.');

  t := pg_temp.seed_task(s3, 'Демонтаж перегородок 3 этажа', 'Гипсокартон, около 80 м².', e2, m, d + interval '6 days');

  t := pg_temp.seed_task(s3, 'Замер помещений', 'Обмерный план для дизайнера.', e2, m, d + interval '4 days');
  perform pg_temp.seed_move(t, 'in_progress', e2, d + interval '4 days' + interval '2 hours');
  perform pg_temp.seed_move(t, 'review',      e2, d + interval '5 days', 'План приложил в общий чат.');
  perform pg_temp.seed_move(t, 'accepted',    m,  d + interval '6 days');
end;
$$;

select s.name as site, t.title, t.status, p.full_name as assignee,
       (select count(*) from public.task_status_history h where h.task_id = t.id) as history_rows
from public.tasks t
join public.sites s on s.id = t.site_id
join public.profiles p on p.id = t.assignee_id
order by s.name, t.created_at;
