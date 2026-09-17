import { demoData } from './demoData'
import type { AppData, Task } from '../types'
import { isSupabaseConfigured, supabase } from './supabase'

const STORAGE_KEY = 'taskflow-command-center-data'

export async function loadAppData(): Promise<AppData> {
  if (!isSupabaseConfigured || !supabase) {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) return JSON.parse(stored) as AppData
    localStorage.setItem(STORAGE_KEY, JSON.stringify(demoData))
    return demoData
  }

  const [{ data: project }, { data: members }, { data: tasks }] = await Promise.all([
    supabase.from('projects').select('*').limit(1).single(),
    supabase.from('project_members').select('user_id, profiles(*)'),
    supabase.from('tasks').select('*').order('created_at', { ascending: false }),
  ])
  if (!project) throw new Error('No project available')
  return {
    project: { id: project.id, name: project.name, description: project.description, owner: project.owner_id, updatedAt: project.updated_at },
    members: (members ?? []).map((entry) => entry.profiles),
    tasks: (tasks ?? []).map((task) => ({ id: task.id, title: task.title, description: task.description, status: task.status, priority: task.priority, dueDate: task.due_date, assigneeId: task.assignee_id, createdAt: task.created_at })),
  } as unknown as AppData
}

export async function saveTasks(tasks: Task[]): Promise<void> {
  if (!isSupabaseConfigured || !supabase) {
    const current = await loadAppData()
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...current, tasks }))
    return
  }
  const updates = tasks.map((task) => supabase!.from('tasks').update({ status: task.status, title: task.title, description: task.description, priority: task.priority, due_date: task.dueDate, assignee_id: task.assigneeId }).eq('id', task.id))
  await Promise.all(updates)
}

export async function createTask(task: Task, projectId = 'p1', createdBy?: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  const { error } = await supabase.from('tasks').insert({ id: task.id, project_id: projectId, title: task.title, description: task.description, status: task.status, priority: task.priority, due_date: task.dueDate, assignee_id: task.assigneeId, created_by: createdBy })
  if (error) throw error
}

export async function deleteTask(taskId: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return
  const { error } = await supabase.from('tasks').delete().eq('id', taskId)
  if (error) throw error
}
