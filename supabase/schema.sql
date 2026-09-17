create extension if not exists "pgcrypto";

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null,
  avatar_url text,
  role text not null default 'Member',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  owner_id uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.project_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'Member',
  created_at timestamptz not null default now(),
  unique(project_id, user_id)
);

create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  title text not null check (char_length(title) between 1 and 180),
  description text not null default '',
  status text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority text not null default 'medium' check (priority in ('low', 'medium', 'high', 'urgent')),
  due_date date,
  assignee_id uuid references public.profiles(id) on delete set null,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tasks_project_status_idx on public.tasks(project_id, status);
create index if not exists tasks_assignee_status_idx on public.tasks(assignee_id, status);
create index if not exists project_members_user_idx on public.project_members(user_id);

create or replace view public.project_member_workload as
select pm.project_id, p.id as user_id, p.full_name, p.email,
  count(t.id)::int as total_assigned,
  count(t.id) filter (where t.status = 'todo')::int as todo_count,
  count(t.id) filter (where t.status = 'in_progress')::int as in_progress_count,
  count(t.id) filter (where t.status = 'done')::int as done_count,
  (count(t.id) filter (where t.status = 'in_progress') > 5) as is_overloaded
from public.project_members pm
join public.profiles p on p.id = pm.user_id
left join public.tasks t on t.project_id = pm.project_id and t.assignee_id = pm.user_id
group by pm.project_id, p.id, p.full_name, p.email;

alter table public.profiles enable row level security;
alter table public.projects enable row level security;
alter table public.project_members enable row level security;
alter table public.tasks enable row level security;

create or replace function public.is_project_member(target_project uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from public.project_members where project_id = target_project and user_id = auth.uid())
    or exists(select 1 from public.projects where id = target_project and owner_id = auth.uid());
$$;

create or replace function public.is_project_owner(target_project uuid)
returns boolean language sql security definer set search_path = public as $$
  select exists(select 1 from public.projects where id = target_project and owner_id = auth.uid());
$$;

create policy "profiles visible to signed in users" on public.profiles for select to authenticated using (true);
create policy "users create own profile" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "users update own profile" on public.profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());
create policy "members can view projects" on public.projects for select to authenticated using (public.is_project_member(id));
create policy "users create projects" on public.projects for insert to authenticated with check (owner_id = auth.uid());
create policy "owners manage projects" on public.projects for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "owners delete projects" on public.projects for delete using (owner_id = auth.uid());
create policy "members view memberships" on public.project_members for select to authenticated using (public.is_project_member(project_id));
create policy "owners add members" on public.project_members for insert to authenticated with check (public.is_project_owner(project_id));
create policy "owners remove members" on public.project_members for delete to authenticated using (public.is_project_owner(project_id));
create policy "members view tasks" on public.tasks for select to authenticated using (public.is_project_member(project_id));
create policy "members create tasks" on public.tasks for insert to authenticated with check (public.is_project_member(project_id) and created_by = auth.uid());
create policy "members update tasks" on public.tasks for update to authenticated using (public.is_project_member(project_id)) with check (public.is_project_member(project_id));
create policy "owners delete tasks" on public.tasks for delete to authenticated using (public.is_project_owner(project_id));
