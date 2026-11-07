insert into public.profiles (id, full_name, role)
select u.id, split_part(u.email, '@', 1), 'executor'
from auth.users u
where u.email in ('manager@test.ru', 'executor1@test.ru', 'executor2@test.ru')
on conflict (id) do nothing;

update public.profiles p
set full_name = v.full_name,
    role      = v.role::public.user_role
from auth.users u
join (values
  ('manager@test.ru',   'Иван Петров',      'manager'),
  ('executor1@test.ru', 'Алексей Смирнов',  'executor'),
  ('executor2@test.ru', 'Мария Кузнецова',  'executor')
) as v(email, full_name, role) on v.email = u.email
where p.id = u.id;

select u.email, p.full_name, p.role
from public.profiles p
join auth.users u on u.id = p.id
order by p.role, u.email;
