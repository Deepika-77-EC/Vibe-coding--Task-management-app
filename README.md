# TaskFlow Command Center

TaskFlow Command Center is a focused, dark SaaS-style Kanban workspace for coordinating a product launch. It is built with React, TypeScript, Vite, Supabase, PostgreSQL, and `lucide-react`.

## What works

- Three-column Kanban board: To-do, In progress, Done
- Native drag-and-drop status changes with optimistic rollback on failure
- Task creation and deletion, priority filters, search, due-date states, and assignees
- Team workload overview with the required `in_progress_count > 5` warning rule
- Red pulse is applied only to overloaded member avatars
- Supabase Auth login, registration, session restore, logout, and profile updates
- Local demo mode with persistent `localStorage` data when Supabase variables are absent
- Supabase schema, RLS policies, workload view, and seed script in `supabase/`
- Responsive sidebar, horizontally scrollable mobile board, loading, empty, toast, and modal states

## Run locally

```bash
npm install
npm run dev
```

The app starts in local demo mode without any credentials. Demo data includes seven in-progress tasks assigned to Priya so the workload warning is visible immediately. Changes persist in the browser until local storage is cleared.

## Supabase setup

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local`.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` with the public project values.
4. Run `supabase/schema.sql` in the SQL editor.
5. Create users through Supabase Auth and update the placeholder ids in `supabase/seed.sql` before running it.
6. Start the app again with `npm run dev`.

Only the public anonymous key belongs in the browser. Never use a service role key in Vite environment variables. When the two variables are present, login and registration use Supabase Auth automatically; without them, the app intentionally falls back to the local demo adapter.

## Architecture

- `src/App.tsx`: presentation and interaction orchestration
- `src/types.ts`: shared domain types
- `src/lib/taskService.ts`: persistence boundary for local demo and Supabase adapters
- `src/lib/demoData.ts`: clearly separated development fixture data
- `supabase/schema.sql`: relational tables, indexes, workload view, helper functions, and RLS
- `supabase/seed.sql`: optional demonstration dataset

The server-side `project_member_workload` view calculates assigned, to-do, in-progress, done, and overloaded counts. The overload predicate is deliberately `count(...) > 5`, so exactly five active tasks does not warn.

## Important assumptions

The initial screen is the project command center because it is the interview/demo-critical workflow. Authentication and multi-route expansion are represented by the Supabase schema and service boundary, while the local mode keeps the core workflow runnable with no external service. Supabase deployments should use the RLS policies as the authorization source of truth.
