---
applyTo: "database/**"
---

You are working on the Supabase backend of the mini CRM. Postgres is the only backend: there is no separate API server.

Schema:

- `profiles(id, full_name, role)` — role is `manager` or `executor`. The role is read only from this table, never from `user_metadata`.
- `sites(id, name, address, created_by, created_at)`.
- `tasks(id, site_id, title, description, assignee_id, status, created_by, created_at, updated_at)`.
- `task_status_history(id, task_id, from_status, to_status, changed_by, comment, created_at)`.

Status flow: `new → in_progress → review → accepted`, and `review → rework → in_progress`. Only the assigned executor moves a task to `in_progress` and `review`. Only a manager can accept or return to rework, and a comment is required for rework. An accepted task cannot be changed.

Rules for any change:

- Every schema change is a new migration in `database/supabase/migrations/` named `YYYYMMDDHHMMSS_short_name.sql`. Never edit an already applied migration.
- Every new table gets `enable row level security`, explicit policies `to authenticated`, and explicit column-level GRANTs. Revoke defaults from `anon` and `authenticated` first.
- Status changes go only through `public.change_task_status`. Clients must never get UPDATE on `tasks.status`, `created_by` or timestamps.
- Nobody writes to `task_status_history` directly; only database functions do.
- Helper and trigger functions go into the `private` schema with `set search_path = ''` and fully qualified names. Revoke EXECUTE from `public` and `anon`.
- `security definer` only when it is really needed, and always with `set search_path = ''`.
- Use `select ... for update` when a function reads a row and then changes it.
- Raise errors in Russian with a proper `errcode`.
- When the schema changes, regenerate frontend types with `npm run gen:types`.
- When adding a rule, add a matching check to `scripts/security-check.ts`: it logs in with the anon key and expects the forbidden action to fail.
