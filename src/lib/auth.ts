import { isSupabaseConfigured, supabase } from './supabase'

export interface LocalUser {
  id: string
  fullName: string
  email: string
  password?: string
  role: string
}

const USERS_KEY = 'taskflow-command-center-users'
const SESSION_KEY = 'taskflow-command-center-session'
const defaultUser: LocalUser = { id: 'local-alex', fullName: 'Alex Morgan', email: 'alex@taskflow.dev', password: 'demo1234', role: 'Product lead' }

function readUsers(): LocalUser[] {
  const stored = localStorage.getItem(USERS_KEY)
  if (stored) return JSON.parse(stored) as LocalUser[]
  localStorage.setItem(USERS_KEY, JSON.stringify([defaultUser]))
  return [defaultUser]
}

export function getLocalSession(): LocalUser | null {
  const id = localStorage.getItem(SESSION_KEY)
  return readUsers().find((user) => user.id === id) ?? null
}

export function signInLocal(email: string, password: string): LocalUser {
  const user = readUsers().find((candidate) => candidate.email.toLowerCase() === email.trim().toLowerCase() && candidate.password === password)
  if (!user) throw new Error('Invalid email or password')
  localStorage.setItem(SESSION_KEY, user.id)
  return user
}

export function signUpLocal(fullName: string, email: string, password: string): LocalUser {
  const users = readUsers()
  if (users.some((user) => user.email.toLowerCase() === email.trim().toLowerCase())) throw new Error('An account with this email already exists')
  const user: LocalUser = { id: `local-${Date.now()}`, fullName: fullName.trim(), email: email.trim(), password, role: 'Member' }
  localStorage.setItem(USERS_KEY, JSON.stringify([...users, user]))
  localStorage.setItem(SESSION_KEY, user.id)
  return user
}

export function signOutLocal() {
  localStorage.removeItem(SESSION_KEY)
}

export function updateLocalProfile(userId: string, fullName: string): LocalUser | null {
  const users = readUsers()
  const updated = users.map((user) => user.id === userId ? { ...user, fullName: fullName.trim() } : user)
  localStorage.setItem(USERS_KEY, JSON.stringify(updated))
  return updated.find((user) => user.id === userId) ?? null
}

function fromSupabaseUser(user: { id: string; email?: string; user_metadata?: Record<string, unknown> }): LocalUser {
  return {
    id: user.id,
    email: user.email ?? '',
    fullName: typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : user.email?.split('@')[0] ?? 'TaskFlow user',
    role: typeof user.user_metadata?.role === 'string' ? user.user_metadata.role : 'Member',
  }
}

export async function getSessionUser(): Promise<LocalUser | null> {
  if (!isSupabaseConfigured || !supabase) return getLocalSession()
  const { data: { session } } = await supabase.auth.getSession()
  return session?.user ? fromSupabaseUser(session.user) : null
}

export async function signIn(email: string, password: string): Promise<LocalUser> {
  if (!isSupabaseConfigured || !supabase) return signInLocal(email, password)
  const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
  if (error || !data.user) throw new Error(error?.message ?? 'Unable to sign in')
  return fromSupabaseUser(data.user)
}

export async function signUp(fullName: string, email: string, password: string): Promise<LocalUser> {
  if (!isSupabaseConfigured || !supabase) return signUpLocal(fullName, email, password)
  const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: fullName.trim(), role: 'Member' } } })
  if (error || !data.user) throw new Error(error?.message ?? 'Unable to create account')
  if (!data.session) throw new Error('Account created. Check your email to confirm it, then sign in.')
  const profile = fromSupabaseUser(data.user)
  const { error: profileError } = await supabase.from('profiles').upsert({ id: profile.id, full_name: profile.fullName, email: profile.email, role: profile.role })
  if (profileError) throw new Error('Account created, but the profile could not be saved. Run the Supabase schema first.')
  return profile
}

export async function signOut(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) { signOutLocal(); return }
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}

export async function updateProfile(userId: string, fullName: string): Promise<LocalUser | null> {
  if (!isSupabaseConfigured || !supabase) return updateLocalProfile(userId, fullName)
  const { data, error } = await supabase.auth.updateUser({ data: { full_name: fullName.trim() } })
  if (error || !data.user) throw new Error(error?.message ?? 'Unable to update profile')
  const profile = fromSupabaseUser(data.user)
  const { error: profileError } = await supabase.from('profiles').update({ full_name: profile.fullName, updated_at: new Date().toISOString() }).eq('id', userId)
  if (profileError) throw new Error('Profile updated in Auth, but the profile record could not be saved.')
  return profile
}
