export type Status = 'todo' | 'in_progress' | 'done'
export type Priority = 'low' | 'medium' | 'high' | 'urgent'

export interface Member {
  id: string
  name: string
  email: string
  role: string
  initials: string
  color: string
}

export interface Task {
  id: string
  title: string
  description: string
  status: Status
  priority: Priority
  dueDate: string | null
  assigneeId: string | null
  createdAt: string
}

export interface Project {
  id: string
  name: string
  description: string
  owner: string
  updatedAt: string
}

export interface AppData {
  project: Project
  members: Member[]
  tasks: Task[]
}
