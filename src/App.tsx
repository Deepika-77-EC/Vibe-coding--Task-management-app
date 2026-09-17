import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { Activity, ArrowUpRight, BarChart3, Bell, CalendarDays, Check, ChevronDown, CircleHelp, ClipboardList, Clock3, Eye, EyeOff, Filter, FolderKanban, LayoutDashboard, LogOut, Menu, MoreHorizontal, Plus, Search, Settings, SlidersHorizontal, Sparkles, Target, Users, X, Zap } from 'lucide-react'
import { createTask, deleteTask, loadAppData, saveTasks } from './lib/taskService'
import { isSupabaseConfigured, supabase } from './lib/supabase'
import { getSessionUser, signIn, signOut, signUp, updateProfile, type LocalUser } from './lib/auth'
import type { AppData, Member, Priority, Status, Task } from './types'

const statusMeta: Record<Status, { label: string; kicker: string; color: string }> = {
  todo: { label: 'To-do', kicker: 'Queued up', color: '#8e9aaf' },
  in_progress: { label: 'In progress', kicker: 'In motion', color: '#7d71ee' },
  done: { label: 'Done', kicker: 'Shipped', color: '#51c1a9' },
}
const priorityMeta: Record<Priority, { label: string; color: string }> = {
  low: { label: 'Low', color: '#8e9aaf' }, medium: { label: 'Medium', color: '#e5ad5c' }, high: { label: 'High', color: '#e77986' }, urgent: { label: 'Urgent', color: '#f05c74' },
}

function initials(name: string) { return name.split(' ').map((part) => part[0]).join('').slice(0, 2).toUpperCase() }
function formatDueDate(date: string | null) {
  if (!date) return 'No due date'
  const today = new Date('2026-09-17T12:00:00')
  const due = new Date(`${date}T12:00:00`)
  const diff = Math.round((due.getTime() - today.getTime()) / 86400000)
  if (diff < 0) return 'Overdue'
  if (diff === 0) return 'Due today'
  if (diff === 1) return 'Due tomorrow'
  return due.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default function App() {
  const [session, setSession] = useState<LocalUser | null>(null)
  const [authChecked, setAuthChecked] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login')
  const [data, setData] = useState<AppData | null>(null)
  const [activeNav, setActiveNav] = useState('Dashboard')
  const [filter, setFilter] = useState<'all' | Priority>('all')
  const [query, setQuery] = useState('')
  const [isCreateOpen, setCreateOpen] = useState(false)
  const [isMemberOpen, setMemberOpen] = useState(false)
  const [draggedId, setDraggedId] = useState<string | null>(null)
  const [notice, setNotice] = useState('')
  const [mobileNav, setMobileNav] = useState(false)
  const [workspaceOpen, setWorkspaceOpen] = useState(false)
  const [rangeOpen, setRangeOpen] = useState(false)
  const [range, setRange] = useState('This week')

  useEffect(() => { getSessionUser().then(setSession).finally(() => setAuthChecked(true)) }, [])
  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    const { data: listener } = supabase.auth.onAuthStateChange((_event, authSession) => setSession(authSession?.user ? { id: authSession.user.id, email: authSession.user.email ?? '', fullName: typeof authSession.user.user_metadata?.full_name === 'string' ? authSession.user.user_metadata.full_name : authSession.user.email?.split('@')[0] ?? 'TaskFlow user', role: typeof authSession.user.user_metadata?.role === 'string' ? authSession.user.user_metadata.role : 'Member' } : null))
    return () => listener.subscription.unsubscribe()
  }, [])
  useEffect(() => { if (session) loadAppData().then(setData).catch(() => setNotice('Unable to load workspace data.')) }, [session])
  useEffect(() => { if (!notice) return; const timer = window.setTimeout(() => setNotice(''), 3000); return () => window.clearTimeout(timer) }, [notice])

  const tasks = data?.tasks ?? []
  const members = data?.members ?? []
  const visibleTasks = useMemo(() => tasks.filter((task) => {
    const assignee = members.find((member) => member.id === task.assigneeId)
    const matchesFilter = filter === 'all' || task.priority === filter
    const haystack = `${task.title} ${task.description} ${assignee?.name ?? ''}`.toLowerCase()
    return matchesFilter && haystack.includes(query.toLowerCase())
  }), [tasks, members, filter, query])

  async function moveTask(taskId: string, status: Status) {
    if (!data) return
    const previous = data.tasks
    const next = previous.map((task) => task.id === taskId ? { ...task, status } : task)
    setData({ ...data, tasks: next })
    try { await saveTasks(next); setNotice(`Task moved to ${statusMeta[status].label}.`) }
    catch { setData({ ...data, tasks: previous }); setNotice('Unable to update this task. Please try again.') }
  }

  async function addTask(form: { title: string; description: string; priority: Priority; dueDate: string; assigneeId: string }) {
    if (!data || !session) return
    const newTask: Task = { id: `local-${Date.now()}`, title: form.title, description: form.description, priority: form.priority, dueDate: form.dueDate || null, assigneeId: form.assigneeId || null, status: 'todo', createdAt: new Date().toISOString() }
    setData({ ...data, tasks: [newTask, ...data.tasks] }); setCreateOpen(false); setNotice('Task created successfully.')
    try { await createTask(newTask, data.project.id, session.id) } catch { setNotice('Task created locally. Check your Supabase permissions.') }
  }

  async function removeTask(taskId: string) {
    if (!data || !window.confirm('Delete this task?')) return
    setData({ ...data, tasks: data.tasks.filter((task) => task.id !== taskId) }); setNotice('Task deleted.')
    try { await deleteTask(taskId) } catch { setNotice('Task removed locally. Connect Supabase to persist it.') }
  }

  if (!authChecked) return <div className="loading-screen"><div className="loading-mark"><Sparkles size={20} /></div><span>Restoring your session</span></div>
  if (!session) return <AuthScreen mode={authMode} onModeChange={setAuthMode} onAuthenticated={setSession} />
  if (!data) return <div className="loading-screen"><div className="loading-mark"><Sparkles size={20} /></div><span>Preparing your command center</span></div>

  const totalDone = tasks.filter((task) => task.status === 'done').length
  const completion = Math.round((totalDone / Math.max(tasks.length, 1)) * 100)
  const navItems = [
    { label: 'Dashboard', icon: LayoutDashboard }, { label: 'Projects', icon: FolderKanban }, { label: 'My Tasks', icon: ClipboardList }, { label: 'Team', icon: Users }, { label: 'Analytics', icon: BarChart3 },
  ]

  return <div className="app-shell">
    <aside className={`sidebar ${mobileNav ? 'sidebar-open' : ''}`}>
      <div className="brand"><div className="brand-mark"><Zap size={16} fill="currentColor" /></div><span>TaskFlow</span><small>COMMAND CENTER</small></div>
      <button className="workspace-switcher" onClick={() => setWorkspaceOpen((value) => !value)} aria-expanded={workspaceOpen}><div className="workspace-icon">P</div><div><strong>Product Launch</strong><span>Personal workspace</span></div><ChevronDown size={15} /></button>
      {workspaceOpen && <div className="workspace-menu"><button onClick={() => { setActiveNav('Dashboard'); setWorkspaceOpen(false) }}><span className="project-dot" />Product Launch 2026 <Check size={14} /></button><button onClick={() => setNotice('Create another workspace from Supabase Projects when connected.')}><Plus size={14} /> Add workspace</button></div>}
      <div className="nav-label">Workspace</div>
      <nav>{navItems.map(({ label, icon: Icon }) => <button key={label} className={activeNav === label ? 'nav-item active' : 'nav-item'} onClick={() => { setActiveNav(label); setMobileNav(false) }}><Icon size={17} /><span>{label}</span>{label === 'My Tasks' && <b>8</b>}</button>)}</nav>
      <div className="nav-label project-label">Your projects <button className="mini-action" onClick={() => setNotice('Project creation is available after connecting Supabase Projects.')} title="Add project"><Plus size={14} /></button></div>
      <button className="project-link active-project" onClick={() => setActiveNav('Dashboard')}><span className="project-dot" />Product Launch 2026 <ArrowUpRight size={13} /></button>
      <button className="project-link" onClick={() => setNotice('Website refresh is not connected to this workspace yet.')}><span className="project-dot muted" />Website refresh <ArrowUpRight size={13} /></button>
      <div className="sidebar-bottom"><button className="nav-item" onClick={() => setActiveNav('Settings')}><Settings size={17} /><span>Settings</span></button><button className="profile" onClick={() => setActiveNav('Settings')}><div className="avatar avatar-me">{initials(session.fullName)}</div><div><strong>{session.fullName}</strong><span>{session.role}</span></div><MoreHorizontal size={17} /></button></div>
    </aside>
    {mobileNav && <button className="sidebar-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    <main className="main-area">
      <header className="topbar"><button className="mobile-menu" onClick={() => setMobileNav(true)}><Menu size={20} /></button><div className="breadcrumbs"><span>Workspace</span><span>/</span><strong>{activeNav === 'Settings' ? 'Settings' : 'Product Launch 2026'}</strong></div><div className="topbar-actions"><div className="global-search"><Search size={16} /><input placeholder="Search tasks..." value={query} onChange={(event) => setQuery(event.target.value)} /><kbd>⌘ K</kbd></div><button className="icon-button" onClick={() => setNotice('You are all caught up.')} title="Notifications"><Bell size={18} /><i /></button><button className="avatar avatar-me" onClick={() => setActiveNav('Settings')} title="Open profile">{initials(session.fullName)}</button></div></header>
      <section className="content">
        {activeNav === 'Settings' ? <SettingsPanel session={session} onSessionChange={setSession} onSignedOut={async () => { await signOut(); setSession(null); setData(null) }} /> : activeNav === 'Projects' ? <ProjectsView data={data} onOpen={() => setActiveNav('Dashboard')} /> : activeNav === 'My Tasks' ? <MyTasksView tasks={tasks} members={members} onOpen={() => setActiveNav('Dashboard')} /> : activeNav === 'Team' ? <TeamView members={members} tasks={tasks} /> : activeNav === 'Analytics' ? <AnalyticsView tasks={tasks} members={members} /> : <>
        <div className="page-heading"><div><div className="eyebrow"><span className="live-dot" /> Monday, September 17, 2026</div><h1>Good evening, {session.fullName.split(' ')[0]} <span>✦</span></h1><p>Here's your productivity overview.</p></div><div className="heading-actions"><div className="range-picker"><button className="secondary-button" onClick={() => setRangeOpen((value) => !value)}><CalendarDays size={16} /> {range} <ChevronDown size={14} /></button>{rangeOpen && <div className="range-menu">{['Today', 'This week', 'This month'].map((option) => <button key={option} onClick={() => { setRange(option); setRangeOpen(false) }}>{option}{range === option && <Check size={13} />}</button>)}</div>}</div><button className="primary-button" onClick={() => setCreateOpen(true)}><Plus size={17} /> New task</button></div></div>
        <div className="stat-grid"><StatCard label="Total tasks" value={tasks.length} change="12%" tone="violet" icon={ClipboardList} /><StatCard label="In progress" value={tasks.filter((task) => task.status === 'in_progress').length} change="8%" tone="blue" icon={Activity} /><StatCard label="Completed" value={totalDone} change="24%" tone="green" icon={Check} /><StatCard label="Overdue" value={tasks.filter((task) => task.dueDate && task.dueDate < '2026-09-17' && task.status !== 'done').length} change="3%" tone="red" icon={CircleHelp} /></div>
        <div className="section-head"><div><h2>Product Launch 2026</h2><span className="muted">{data.project.description}</span></div><div className="project-meta"><div className="avatar-stack">{members.slice(0, 4).map((member) => <div key={member.id} className="avatar" style={{ background: member.color }}>{member.initials}</div>)}<span>+2</span></div><button className="ghost-button" onClick={() => setMemberOpen(true)}><Users size={16} /> Manage team</button></div></div>
        <div className="board-toolbar"><div className="toolbar-left"><div className="view-tabs"><button className="selected"><FolderKanban size={15} /> Board</button><button onClick={() => setActiveNav('Analytics')}><BarChart3 size={15} /> Insights</button></div><span className="result-count">{visibleTasks.length} of {tasks.length} tasks</span></div><div className="toolbar-right"><div className="filter-control"><Filter size={15} /><select value={filter} onChange={(event) => setFilter(event.target.value as 'all' | Priority)}><option value="all">All priorities</option><option value="low">Low priority</option><option value="medium">Medium priority</option><option value="high">High priority</option><option value="urgent">Urgent priority</option></select></div><button className="icon-button subtle" onClick={() => { setFilter('all'); setQuery(''); setNotice('Board filters cleared.') }} title="Clear board filters"><SlidersHorizontal size={16} /></button></div></div>
        <div className="board">{(['todo', 'in_progress', 'done'] as Status[]).map((status) => <KanbanColumn key={status} status={status} tasks={visibleTasks.filter((task) => task.status === status)} members={members} onDragStart={setDraggedId} onDrop={() => draggedId && moveTask(draggedId, status)} onDelete={removeTask} onAdd={() => setCreateOpen(true)} />)}</div>
        <div className="dashboard-grid"><section className="panel progress-panel"><div className="panel-title"><div><span className="eyebrow">Delivery health</span><h2>Project progress</h2></div><button className="more-button"><MoreHorizontal size={18} /></button></div><div className="progress-number">{completion}<span>%</span><small>completed</small></div><div className="progress-track"><span style={{ width: `${completion}%` }} /></div><div className="progress-foot"><span>{totalDone} completed of {tasks.length} tasks</span><strong>On track <Check size={14} /></strong></div><div className="milestones"><div><span className="milestone-icon done"><Check size={13} /></span><div><strong>Discovery & planning</strong><span>Completed Sep 10</span></div></div><div><span className="milestone-icon current"><Activity size={13} /></span><div><strong>Build & validate</strong><span>In progress</span></div></div><div><span className="milestone-icon"><span /></span><div><strong>Launch readiness</strong><span>Starts Sep 28</span></div></div></div></section><section className="panel workload-panel"><div className="panel-title"><div><span className="eyebrow">Capacity signal</span><h2>Workload overview</h2></div><button className="ghost-button" onClick={() => setActiveNav('Team')}>View team <span>→</span></button></div><div className="workload-list">{members.map((member) => <WorkloadRow key={member.id} member={member} tasks={tasks} />)}</div></section></div>
        <div className="activity-row"><div><Activity size={17} /><strong>Recent activity</strong></div><button className="activity-link" onClick={() => setNotice('Activity history is up to date.')}>All activity <span>→</span></button></div>
        </>}
      </section>
    </main>
    {notice && <div className="toast"><span className="toast-icon"><Check size={15} /></span>{notice}<button onClick={() => setNotice('')}><X size={14} /></button></div>}
    {isCreateOpen && <TaskModal members={members} onClose={() => setCreateOpen(false)} onSubmit={addTask} />}
    {isMemberOpen && <MemberModal members={members} onClose={() => setMemberOpen(false)} />}
    <div className="demo-badge">{isSupabaseConfigured ? 'Supabase connected' : 'Local demo mode'} <span /></div>
  </div>
}

function AuthScreen({ mode, onModeChange, onAuthenticated }: { mode: 'login' | 'register'; onModeChange: (mode: 'login' | 'register') => void; onAuthenticated: (user: LocalUser) => void }) {
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  async function submit(event: FormEvent) {
    event.preventDefault(); setError('')
    if (mode === 'register' && password !== confirmPassword) { setError('Passwords do not match'); return }
    if (password.length < 6) { setError('Use at least 6 characters for your password'); return }
    setBusy(true)
    try { onAuthenticated(await (mode === 'login' ? signIn(email, password) : signUp(fullName, email, password))) }
    catch (authError) { setError(authError instanceof Error ? authError.message : 'Unable to authenticate') }
    finally { setBusy(false) }
  }

  async function useDemo() { setError(''); setBusy(true); try { onAuthenticated(await signIn('alex@taskflow.dev', 'demo1234')) } catch (authError) { setError(authError instanceof Error ? authError.message : 'Unable to authenticate') } finally { setBusy(false) } }

  return <div className="auth-shell"><div className="auth-orbit orbit-one" /><div className="auth-orbit orbit-two" /><div className="auth-card"><div className="brand auth-brand"><div className="brand-mark"><Zap size={16} fill="currentColor" /></div><span>TaskFlow</span><small>COMMAND CENTER</small></div><div className="auth-copy"><span className="eyebrow">Local workspace access</span><h1>{mode === 'login' ? 'Welcome back.' : 'Create your workspace.'}</h1><p>{mode === 'login' ? 'Sign in to continue to your command center.' : 'Set up a local account for this browser.'}</p></div><form onSubmit={submit}>{mode === 'register' && <label>Full name<input required value={fullName} onChange={(event) => setFullName(event.target.value)} placeholder="Alex Morgan" /></label>}<label>Email<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@company.com" /></label><label>Password<div className="password-field"><input required type={showPassword ? 'text' : 'password'} value={password} onChange={(event) => setPassword(event.target.value)} placeholder="At least 6 characters" /><button type="button" onClick={() => setShowPassword((value) => !value)} title={showPassword ? 'Hide password' : 'Show password'}>{showPassword ? <EyeOff size={16} /> : <Eye size={16} />}</button></div></label>{mode === 'register' && <label>Confirm password<input required type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Repeat your password" /></label>}{error && <div className="form-error">{error}</div>}<button className="primary-button auth-submit" disabled={busy}>{busy ? 'Signing in...' : mode === 'login' ? 'Sign in' : 'Create account'} <span>→</span></button></form><button className="demo-login" onClick={useDemo}>Use local demo account <span>alex@taskflow.dev</span></button><div className="auth-switch">{mode === 'login' ? 'New to TaskFlow?' : 'Already have an account?'} <button onClick={() => { onModeChange(mode === 'login' ? 'register' : 'login'); setError('') }}>{mode === 'login' ? 'Create account' : 'Sign in'}</button></div><small className="auth-note">Your local session is stored only in this browser. Supabase can replace this adapter when environment variables are configured.</small></div></div>
}

function SettingsPanel({ session, onSessionChange, onSignedOut }: { session: LocalUser; onSessionChange: (user: LocalUser) => void; onSignedOut: () => void }) {
  const [fullName, setFullName] = useState(session.fullName)
  const [saved, setSaved] = useState(false)
  async function saveProfile() { try { const updated = await updateProfile(session.id, fullName); if (updated) onSessionChange(updated); setSaved(true); window.setTimeout(() => setSaved(false), 2200) } catch { setSaved(false) } }
  return <div className="settings-page"><div className="page-heading"><div><div className="eyebrow">Workspace preferences</div><h1>Settings</h1><p>Keep your profile and local session details current.</p></div></div><div className="settings-grid"><section className="panel settings-card"><div className="panel-title"><div><span className="eyebrow">Profile</span><h2>Personal details</h2></div><div className="settings-avatar avatar avatar-me">{initials(session.fullName)}</div></div><label>Full name<input value={fullName} onChange={(event) => setFullName(event.target.value)} /></label><label>Email<input value={session.email} disabled /></label><label>Role<input value={session.role} disabled /></label><button className="primary-button" onClick={saveProfile}>{saved ? <><Check size={16} /> Saved</> : 'Save changes'}</button></section><section className="panel settings-card"><div className="panel-title"><div><span className="eyebrow">Account</span><h2>Browser session</h2></div><Settings size={18} color="#8b96aa" /></div><div className="settings-status"><span className="status-dot" /><div><strong>Local session active</strong><span>This browser remembers your account and demo data.</span></div></div><button className="secondary-button logout-button" onClick={onSignedOut}><LogOut size={16} /> Log out</button></section></div></div>
}

function ProjectsView({ data, onOpen }: { data: AppData; onOpen: () => void }) {
  const done = data.tasks.filter((task) => task.status === 'done').length
  return <div className="workspace-page"><div className="page-heading"><div><div className="eyebrow">Workspace directory</div><h1>Projects</h1><p>Choose a project to open its command center.</p></div><button className="primary-button" onClick={onOpen}><FolderKanban size={16} /> Open active project</button></div><div className="project-grid"><button className="project-card active-project-card" onClick={onOpen}><div className="project-card-top"><span className="project-card-icon"><Target size={18} /></span><span className="project-status">Active</span></div><h2>{data.project.name}</h2><p>{data.project.description}</p><div className="project-card-stats"><span><strong>{data.tasks.length}</strong> tasks</span><span><strong>{Math.round((done / Math.max(data.tasks.length, 1)) * 100)}%</strong> complete</span></div><div className="progress-track"><span style={{ width: `${(done / Math.max(data.tasks.length, 1)) * 100}%` }} /></div><div className="project-card-footer">Updated {data.project.updatedAt}<ArrowUpRight size={16} /></div></button><button className="project-card muted-project-card" onClick={onOpen}><div className="project-card-top"><span className="project-card-icon"><FolderKanban size={18} /></span><span className="project-status muted-status">Planned</span></div><h2>Website refresh</h2><p>Design system and content updates for the next public release.</p><div className="project-card-footer">Not connected yet <ArrowUpRight size={16} /></div></button></div></div>
}

function MyTasksView({ tasks, members, onOpen }: { tasks: Task[]; members: Member[]; onOpen: () => void }) {
  const assigned = tasks.filter((task) => task.assigneeId === 'm1')
  return <div className="workspace-page"><div className="page-heading"><div><div className="eyebrow">Personal queue</div><h1>My tasks</h1><p>Everything currently assigned to you.</p></div><button className="secondary-button" onClick={onOpen}><FolderKanban size={16} /> Open board</button></div><div className="task-summary-grid"><SummaryMetric label="Assigned" value={assigned.length} icon={ClipboardList} /><SummaryMetric label="In progress" value={assigned.filter((task) => task.status === 'in_progress').length} icon={Activity} /><SummaryMetric label="Due soon" value={assigned.filter((task) => task.dueDate && task.dueDate <= '2026-09-21').length} icon={Clock3} /></div><section className="panel task-table"><div className="panel-title"><div><span className="eyebrow">Personal queue</span><h2>Assigned tasks</h2></div><span className="muted">{assigned.length} items</span></div>{assigned.length ? assigned.map((task) => <button className="task-table-row" key={task.id} onClick={onOpen}><span className="status-dot" style={{ background: statusMeta[task.status].color }} /><span className="task-table-title"><strong>{task.title}</strong><span>{task.description}</span></span><span className="priority" style={{ color: priorityMeta[task.priority].color, background: `${priorityMeta[task.priority].color}18` }}>{priorityMeta[task.priority].label}</span><span className="due"><CalendarDays size={13} /> {formatDueDate(task.dueDate)}</span><ArrowUpRight size={15} /></button>) : <div className="empty-state"><ClipboardList size={24} /><strong>No tasks assigned yet</strong><span>Open the project board to pick up your next task.</span></div>}</section></div>
}

function TeamView({ members, tasks }: { members: Member[]; tasks: Task[] }) { return <div className="workspace-page"><div className="page-heading"><div><div className="eyebrow">People & capacity</div><h1>Team</h1><p>See assignment balance across the active project.</p></div></div><div className="team-grid">{members.map((member) => <section className="panel team-card" key={member.id}><div className="team-card-head"><div className="avatar" style={{ background: member.color }}>{member.initials}</div><div><h2>{member.name}</h2><span>{member.role}</span></div></div><WorkloadRow member={member} tasks={tasks} /><div className="team-breakdown"><span><strong>{tasks.filter((task) => task.assigneeId === member.id).length}</strong> assigned</span><span><strong>{tasks.filter((task) => task.assigneeId === member.id && task.status === 'done').length}</strong> done</span></div></section>)}</div></div> }

function AnalyticsView({ tasks, members }: { tasks: Task[]; members: Member[] }) { const completed = tasks.filter((task) => task.status === 'done').length; return <div className="workspace-page"><div className="page-heading"><div><div className="eyebrow">Signal & reporting</div><h1>Analytics</h1><p>Live measures from Product Launch 2026.</p></div></div><div className="task-summary-grid"><SummaryMetric label="Total tasks" value={tasks.length} icon={ClipboardList} /><SummaryMetric label="Completion rate" value={`${Math.round((completed / Math.max(tasks.length, 1)) * 100)}%`} icon={Target} /><SummaryMetric label="In progress" value={tasks.filter((task) => task.status === 'in_progress').length} icon={Activity} /></div><div className="analytics-grid"><section className="panel chart-panel"><div className="panel-title"><div><span className="eyebrow">Workflow</span><h2>Tasks by status</h2></div></div>{(['todo', 'in_progress', 'done'] as Status[]).map((status) => <BarRow key={status} label={statusMeta[status].label} value={tasks.filter((task) => task.status === status).length} total={tasks.length} color={statusMeta[status].color} />)}</section><section className="panel chart-panel"><div className="panel-title"><div><span className="eyebrow">Capacity</span><h2>Team workload</h2></div></div>{members.map((member) => <BarRow key={member.id} label={member.name.split(' ')[0]} value={tasks.filter((task) => task.assigneeId === member.id).length} total={Math.max(tasks.length, 1)} color={member.color} />)}</section></div></div> }

function SummaryMetric({ label, value, icon: Icon }: { label: string; value: number | string; icon: typeof Check }) { return <div className="stat-card"><div className="stat-icon violet"><Icon size={18} /></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong></div></div> }
function BarRow({ label, value, total, color }: { label: string; value: number; total: number; color: string }) { return <div className="bar-row"><div><span>{label}</span><strong>{value}</strong></div><div className="progress-track"><span style={{ width: `${Math.min((value / Math.max(total, 1)) * 100, 100)}%`, background: color }} /></div></div> }

function StatCard({ label, value, change, tone, icon: Icon }: { label: string; value: number; change: string; tone: string; icon: typeof Check }) { return <div className="stat-card"><div className={`stat-icon ${tone}`}><Icon size={18} /></div><div className="stat-copy"><span>{label}</span><strong>{value}</strong></div><div className="stat-change"><span>↑ {change}</span><small>vs last week</small></div></div> }

function KanbanColumn({ status, tasks, members, onDragStart, onDrop, onDelete, onAdd }: { status: Status; tasks: Task[]; members: Member[]; onDragStart: (id: string) => void; onDrop: () => void; onDelete: (id: string) => void; onAdd: () => void }) { return <section className="kanban-column" onDragOver={(event) => event.preventDefault()} onDrop={onDrop}><div className="column-head"><div className="column-title"><span className="status-dot" style={{ background: statusMeta[status].color }} /><div><h3>{statusMeta[status].label}</h3><span>{statusMeta[status].kicker}</span></div><b>{tasks.length}</b></div><button className="column-menu"><MoreHorizontal size={17} /></button></div><div className="task-list">{tasks.map((task) => <TaskCard key={task.id} task={task} member={members.find((member) => member.id === task.assigneeId)} onDragStart={() => onDragStart(task.id)} onDelete={() => onDelete(task.id)} />)}{tasks.length === 0 && <div className="column-empty">Drop a task here</div>}</div><button className="add-task-button" onClick={onAdd}><Plus size={16} /> Add task</button></section> }

function TaskCard({ task, member, onDragStart, onDelete }: { task: Task; member?: Member; onDragStart: () => void; onDelete: () => void }) { return <article className="task-card" draggable onDragStart={onDragStart}><div className="task-card-top"><span className="priority" style={{ color: priorityMeta[task.priority].color, background: `${priorityMeta[task.priority].color}18` }}><i style={{ background: priorityMeta[task.priority].color }} />{priorityMeta[task.priority].label}</span><button className="task-menu" onClick={onDelete} title="Delete task"><MoreHorizontal size={16} /></button></div><h4>{task.title}</h4><p>{task.description}</p><div className="task-footer"><span className={task.dueDate && task.dueDate < '2026-09-17' && task.status !== 'done' ? 'due overdue' : 'due'}><CalendarDays size={13} /> {formatDueDate(task.dueDate)}</span>{member && <div className="assignee"><div className="avatar small" style={{ background: member.color }}>{member.initials}</div><span>{member.name.split(' ')[0]}</span></div>}</div></article> }

function WorkloadRow({ member, tasks }: { member: Member; tasks: Task[] }) { const own = tasks.filter((task) => task.assigneeId === member.id); const active = own.filter((task) => task.status === 'in_progress').length; const overloaded = active > 5; return <div className="workload-row"><div className={`avatar ${overloaded ? 'overloaded' : ''}`} style={{ background: overloaded ? undefined : member.color }} title={overloaded ? `High workload: ${active} tasks currently in progress` : `Current workload: ${active} tasks in progress`}>{member.initials}</div><div className="workload-person"><strong>{member.name}</strong><span>{own.length} assigned · {active} in progress</span></div><div className="workload-meter"><div><span style={{ width: `${Math.min((active / 8) * 100, 100)}%`, background: overloaded ? '#ed6877' : member.color }} /></div><strong className={overloaded ? 'danger' : ''}>{active}{overloaded && ' !'}</strong></div></div> }

function TaskModal({ members, onClose, onSubmit }: { members: Member[]; onClose: () => void; onSubmit: (form: { title: string; description: string; priority: Priority; dueDate: string; assigneeId: string }) => void }) { const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [priority, setPriority] = useState<Priority>('medium'); const [dueDate, setDueDate] = useState(''); const [assigneeId, setAssigneeId] = useState(''); return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">New work item</span><h2>Create a task</h2></div><button className="close-button" onClick={onClose}><X size={18} /></button></div><label>Task title<input autoFocus value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Prepare launch narrative" /></label><label>Description<textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add enough context for the team..." rows={4} /></label><div className="form-grid"><label>Priority<select value={priority} onChange={(event) => setPriority(event.target.value as Priority)}>{Object.entries(priorityMeta).map(([key, meta]) => <option key={key} value={key}>{meta.label}</option>)}</select></label><label>Due date<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} /></label></div><label>Assignee<select value={assigneeId} onChange={(event) => setAssigneeId(event.target.value)}><option value="">Unassigned</option>{members.map((member) => <option key={member.id} value={member.id}>{member.name}</option>)}</select></label><div className="modal-actions"><button className="secondary-button" onClick={onClose}>Cancel</button><button className="primary-button" disabled={!title.trim()} onClick={() => onSubmit({ title: title.trim(), description, priority, dueDate, assigneeId })}><Plus size={16} /> Create task</button></div></div></div> }

function MemberModal({ members, onClose }: { members: Member[]; onClose: () => void }) { const [search, setSearch] = useState(''); return <div className="modal-backdrop" onMouseDown={onClose}><div className="modal member-modal" onMouseDown={(event) => event.stopPropagation()}><div className="modal-head"><div><span className="eyebrow">Project access</span><h2>Manage team</h2></div><button className="close-button" onClick={onClose}><X size={18} /></button></div><div className="member-search"><Search size={16} /><input autoFocus value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Search people..." /></div><div className="member-list">{members.filter((member) => `${member.name} ${member.email}`.toLowerCase().includes(search.toLowerCase())).map((member) => <div className="member-row" key={member.id}><div className="avatar" style={{ background: member.color }}>{member.initials}</div><div><strong>{member.name}</strong><span>{member.email}</span></div><span className="role-pill">{member.role}</span><button className="member-added"><Check size={14} /> Added</button></div>)}</div><button className="secondary-button full-width" onClick={onClose}>Done</button></div></div> }
