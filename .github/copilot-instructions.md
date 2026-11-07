# Mini CRM "Sites and Tasks"

Small CRM for a construction company. A manager creates sites and tasks, executors move tasks through statuses, the manager accepts or sends them back for rework. Every status change is written to history.

Repository layout:

- `database/` — Supabase (Postgres) migrations, roles, seed data and a security check script.
- `frontend/` — Vite + React 19 + TypeScript app, deployed to Vercel.

General rules:

- Access control lives in the database (RLS, column GRANTs, the `change_task_status` RPC). The UI only hides buttons. Never move a security check into the frontend only.
- Never use or suggest the `service_role` / secret key anywhere. The frontend and scripts use only the anon / publishable key.
- Never commit `.env` files, passwords or tokens.
- User-facing text and database error messages are in Russian.
- Do not add comments to the code unless the logic is genuinely non-obvious.
- Keep changes small and consistent with the existing style. TypeScript is strict, no `any`.
