-- Run after creating two or more auth users in Supabase Auth.
-- Replace the UUID placeholders with ids from auth.users.
insert into public.profiles (id, full_name, email, role) values
  ('00000000-0000-0000-0000-000000000001', 'Alex Morgan', 'alex@taskflow.dev', 'Product lead'),
  ('00000000-0000-0000-0000-000000000002', 'Priya Shah', 'priya@taskflow.dev', 'Senior engineer'),
  ('00000000-0000-0000-0000-000000000003', 'Rahul Mehta', 'rahul@taskflow.dev', 'Product designer')
on conflict (id) do nothing;

insert into public.projects (id, name, description, owner_id)
values ('10000000-0000-0000-0000-000000000001', 'Product Launch 2026', 'A focused command center for coordinating the next release.', '00000000-0000-0000-0000-000000000001')
on conflict (id) do nothing;

insert into public.project_members (project_id, user_id, role) values
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001', 'Owner'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000002', 'Member'),
  ('10000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000003', 'Member')
on conflict (project_id, user_id) do nothing;

insert into public.tasks (project_id, title, description, status, priority, assignee_id, created_by) values
  ('10000000-0000-0000-0000-000000000001', 'Finalize onboarding journey', 'Review the latest journey map.', 'todo', 'high', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'Audit workspace permissions', 'Map roles to project membership.', 'todo', 'medium', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'Prepare launch narrative', 'Turn strategy notes into a stakeholder narrative.', 'todo', 'low', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'Build command palette', 'Add keyboard-first navigation.', 'in_progress', 'urgent', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'Instrument activation events', 'Define first-session events.', 'in_progress', 'high', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'Refine empty states', 'Give each view a useful next action.', 'in_progress', 'medium', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'QA responsive navigation', 'Exercise mobile and tablet breakpoints.', 'in_progress', 'medium', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'Set up release checklist', 'Create the final launch checklist.', 'in_progress', 'low', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'Write handoff notes', 'Capture implementation decisions.', 'in_progress', 'low', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'Stakeholder review deck', 'Assemble narrative and metrics.', 'in_progress', 'high', '00000000-0000-0000-0000-000000000002', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'Create visual direction', 'Land the visual system.', 'done', 'high', '00000000-0000-0000-0000-000000000003', '00000000-0000-0000-0000-000000000001'),
  ('10000000-0000-0000-0000-000000000001', 'Map core workflows', 'Document primary user journeys.', 'done', 'medium', '00000000-0000-0000-0000-000000000001', '00000000-0000-0000-0000-000000000001');
