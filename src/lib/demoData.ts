import type { AppData, Member, Task } from '../types'

export const members: Member[] = [
  { id: 'm1', name: 'Alex Morgan', email: 'alex@taskflow.dev', role: 'Product lead', initials: 'AM', color: '#7467f0' },
  { id: 'm2', name: 'Priya Shah', email: 'priya@taskflow.dev', role: 'Senior engineer', initials: 'PS', color: '#35b6ad' },
  { id: 'm3', name: 'Rahul Mehta', email: 'rahul@taskflow.dev', role: 'Product designer', initials: 'RM', color: '#efaa62' },
  { id: 'm4', name: 'Jordan Lee', email: 'jordan@taskflow.dev', role: 'QA engineer', initials: 'JL', color: '#e2718a' },
]

const task = (id: string, title: string, description: string, status: Task['status'], priority: Task['priority'], assigneeId: string, dueDate: string | null): Task => ({ id, title, description, status, priority, assigneeId, dueDate, createdAt: '2026-09-12T10:00:00Z' })

export const initialTasks: Task[] = [
  task('t1', 'Finalize onboarding journey', 'Review the latest journey map and convert open questions into implementation-ready stories.', 'todo', 'high', 'm1', '2026-09-18'),
  task('t2', 'Audit workspace permissions', 'Map current roles to the new project membership model.', 'todo', 'medium', 'm2', '2026-09-20'),
  task('t3', 'Prepare launch narrative', 'Turn the product strategy notes into a crisp narrative for the stakeholder review.', 'todo', 'low', 'm3', '2026-09-22'),
  task('t4', 'Build command palette', 'Add keyboard-first navigation to the primary workspace shell.', 'in_progress', 'urgent', 'm2', '2026-09-17'),
  task('t5', 'Instrument activation events', 'Define and wire the first-session events in the analytics layer.', 'in_progress', 'high', 'm2', '2026-09-19'),
  task('t6', 'Refine empty states', 'Give every major view a useful next action when data is missing.', 'in_progress', 'medium', 'm2', '2026-09-21'),
  task('t7', 'QA responsive navigation', 'Exercise the mobile drawer and tablet board across breakpoints.', 'in_progress', 'medium', 'm2', '2026-09-21'),
  task('t8', 'Set up release checklist', 'Create the final launch checklist with owners and evidence links.', 'in_progress', 'low', 'm2', '2026-09-24'),
  task('t9', 'Write handoff notes', 'Capture the decisions and tradeoffs for the implementation team.', 'in_progress', 'low', 'm2', '2026-09-25'),
  task('t10', 'Stakeholder review deck', 'Assemble the narrative, metrics, and key decisions for review.', 'in_progress', 'high', 'm2', '2026-09-26'),
  task('t11', 'Create visual direction', 'Land the visual system for the first production milestone.', 'done', 'high', 'm3', '2026-09-12'),
  task('t12', 'Map core workflows', 'Document the three primary user journeys and edge cases.', 'done', 'medium', 'm1', '2026-09-10'),
  task('t13', 'Provision staging project', 'Set up the shared environment and access for the team.', 'done', 'low', 'm4', '2026-09-08'),
]

export const demoData: AppData = {
  project: { id: 'p1', name: 'Product Launch 2026', description: 'A focused command center for coordinating the next release across product, design, and engineering.', owner: 'Alex Morgan', updatedAt: 'Today at 9:42 AM' },
  members,
  tasks: initialTasks,
}
