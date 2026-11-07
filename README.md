# Мини-CRM «Объекты и задачи»

Небольшая CRM для строительной компании. Постановщик ставит задачи по объектам (стройкам), исполнители берут их в работу и отправляют на проверку, постановщик принимает работу или возвращает на доработку. Каждая смена статуса записывается в историю.

Главное в проекте — правила доступа работают **в базе данных** (RLS, права на колонки, RPC-функция смены статуса). Интерфейс только скрывает лишние кнопки; обращение к API напрямую (curl, консоль браузера) упирается в те же правила.

## Стек

- Vite + React 19 + TypeScript (strict)
- Mantine (UI), TanStack Query (загрузка данных), React Router
- Supabase: Postgres, Auth (email + пароль), `@supabase/supabase-js` v2
- Supabase CLI: миграции в `database/supabase/migrations/`
- Деплой: Vercel

## Структура

```
database/                    — всё, что относится к базе
  supabase/
    config.toml
    migrations/20261104120000_init.sql   — типы, таблицы, триггеры, RLS, GRANT, RPC
    roles.sql                — имена и роли тестовых пользователей
    seed.sql                 — тестовые объекты и задачи с историей
  scripts/security-check.ts  — проверка безопасности через anon key
frontend/                    — React-приложение
  src/
    lib/statuses.ts          — getAvailableActions(): какие кнопки показать
    lib/supabase.ts          — клиент Supabase (только anon key)
    auth/                    — сессия и профиль (роль — из таблицы profiles)
    api/                     — запросы и мутации (TanStack Query)
    components/, pages/      — экраны
    types/database.ts        — типы схемы (supabase gen types)
  vercel.json
DECISIONS.md                 — решения и допущения
EXPLANATION.md               — объяснение для руководителя
```

## Запуск локально

Нужны Node.js 20+ и проект в [Supabase](https://supabase.com).

```bash
git clone https://github.com/sadriddinovtohir/mini-crm-sites-tasks.git
cd mini-crm-sites-tasks

# 1. Зависимости
cd database && npm i && cd ..
cd frontend && npm i && cd ..

# 2. Переменные окружения
# создать frontend/.env и database/.env — см. «Переменные окружения» ниже

# 3. Применить миграцию к проекту Supabase
cd database
npx supabase login
npx supabase link --project-ref <project-ref>
npx supabase db push
```

4. **Отключить регистрацию:** Dashboard → Authentication → Sign In / Providers → выключить «Allow new users to sign up».
5. **Создать пользователей:** Dashboard → Authentication → Users → Add user (отметить «Auto Confirm User»):
   `manager@test.ru`, `executor1@test.ru`, `executor2@test.ru`.
6. **Роли и тестовые данные:** в Dashboard → SQL Editor выполнить по очереди содержимое
   `database/supabase/roles.sql`, затем `database/supabase/seed.sql`.
   (`seed.sql` очищает объекты и задачи, его можно запускать повторно.)
7. **Запустить фронтенд:**

```bash
cd frontend
npm run dev        # http://localhost:5173
```

Типы базы можно перегенерировать после `supabase link`: `cd database && npm run gen:types`.

Паролей в репозитории нет — доступы к тестовым пользователям передаются в чате.

## Проверка безопасности

Скрипт работает с **anon key**, как обычный клиент: логинится тестовыми пользователями и пытается сделать запрещённое (прочитать чужое, сменить статус напрямую, подделать историю, назначить себе роль и т.д.). По каждому пункту выводит ✅ или ❌. Для честной проверки он создаёт временные объект и задачи от имени постановщика и удаляет их в конце.

```bash
cd database
# в .env: SUPABASE_URL, SUPABASE_ANON_KEY, MANAGER_PASSWORD, EXECUTOR1_PASSWORD, EXECUTOR2_PASSWORD
npx tsx scripts/security-check.ts
```

Код выхода `0` — все проверки пройдены, `1` — есть ❌.

## Деплой на Vercel

1. Импортировать репозиторий в Vercel, **Root Directory: `frontend`** (фреймворк Vite определится сам: build `npm run build`, output `dist`).
2. Settings → Environment Variables: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`.
3. Deploy.

`frontend/vercel.json` переписывает все пути на `index.html` — иначе при обновлении страницы `/sites/...` Vercel вернёт 404 (маршруты обрабатывает React Router в браузере).

В Supabase → Authentication → URL Configuration можно указать адрес деплоя как Site URL.

## Ключи

- Во фронтенде только `VITE_SUPABASE_URL` и `VITE_SUPABASE_ANON_KEY` (или publishable key). Этот ключ публичный по замыслу: защита держится на RLS.
- `service_role` / secret key не используется нигде: ни во фронтенде, ни в скриптах, ни в репозитории.
- `.env` в `.gitignore` и в репозиторий не попадает.

## Переменные окружения

`frontend/.env`:

```
VITE_SUPABASE_URL=https://<project-ref>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon или publishable key>
```

`database/.env` (для скрипта проверки безопасности):

```
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_ANON_KEY=<anon или publishable key>
MANAGER_EMAIL=manager@test.ru
MANAGER_PASSWORD=
EXECUTOR1_EMAIL=executor1@test.ru
EXECUTOR1_PASSWORD=
EXECUTOR2_EMAIL=executor2@test.ru
EXECUTOR2_PASSWORD=
```
