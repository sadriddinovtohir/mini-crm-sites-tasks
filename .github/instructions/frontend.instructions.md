---
applyTo: "frontend/**"
---

You are working on the React frontend of the mini CRM.

Stack: Vite, React 19, TypeScript (strict), Mantine 9 for UI, TanStack Query for data, React Router, `@supabase/supabase-js` v2. Deployed to Vercel with `frontend` as the root directory.

Structure:

- `src/lib/supabase.ts` — the only Supabase client, created with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- `src/api/` — queries and mutations as TanStack Query hooks. Components never call `supabase` directly.
- `src/auth/` — session and profile. The role comes from the `profiles` table.
- `src/lib/statuses.ts` — status labels and `getAvailableActions()`, which only decides which buttons to show. The database is the source of truth.
- `src/lib/errors.ts` — turns Supabase / Postgres errors into Russian messages.
- `src/types/database.ts` — generated types, do not edit by hand.
- `src/components/`, `src/pages/` — UI.

Rules:

- Change task status only with `supabase.rpc('change_task_status', ...)`, never with `update`.
- On insert or update send only the columns the client is allowed to write (`name`, `address` for sites; `site_id`, `title`, `description`, `assignee_id` for tasks).
- Hiding a button is a UX choice, not protection. Do not assume that a hidden button means the action is safe.
- Show errors with `notifyError` and success with `notifySuccess` from `src/lib/errors.ts`. All UI text is in Russian.
- After a mutation, invalidate the related query keys instead of updating state by hand.
- Use Mantine components and props instead of custom CSS where possible.
- No `any`, no `@ts-ignore`, no secrets in code. Only `VITE_` variables reach the browser, so never put a secret key there.
- Run `npm run build` before committing; it runs `tsc -b` and must pass with no errors.
