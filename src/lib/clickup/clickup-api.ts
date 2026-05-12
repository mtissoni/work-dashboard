import { supabase } from '../supabase'
import type {
  ClickUpTeam,
  ClickUpSpace,
  ClickUpFolder,
  ClickUpList,
} from '../../types'

// Raw ClickUp API task shape (from their API, not our cache)
export interface ClickUpApiTask {
  id: string
  name: string
  description: string | null
  status: { status: string; color: string }
  priority: { id: string; priority: string; color: string } | null
  assignees: { id: number; username: string; profilePicture: string | null }[]
  tags: { name: string; tag_fg: string; tag_bg: string }[]
  due_date: string | null // Unix ms string
  date_created: string
  date_updated: string
  url: string
  list: { id: string; name: string }
  folder: { id: string; name: string }
  space: { id: string }
}

async function clickupFetch<T>(
  method: string,
  path: string,
  token: string,
  body?: unknown
): Promise<T> {
  const { data, error } = await supabase.functions.invoke('clickup-proxy', {
    body: { method, path, body },
    headers: { 'clickup-token': token },
  })

  if (error) {
    throw new Error(`ClickUp proxy error: ${error.message}`)
  }

  // The edge function returns the ClickUp response as-is
  // If it has an error field from ClickUp, throw it
  if (data?.err) {
    throw new Error(`ClickUp API error: ${data.err}`)
  }

  return data as T
}

// --- Hierarchy ---

export async function fetchTeams(token: string): Promise<ClickUpTeam[]> {
  const res = await clickupFetch<{ teams: { id: string; name: string }[] }>(
    'GET',
    '/team',
    token
  )
  return res.teams?.map((t) => ({ id: t.id, name: t.name })) ?? []
}

export async function fetchSpaces(token: string, teamId: string): Promise<ClickUpSpace[]> {
  const res = await clickupFetch<{ spaces: { id: string; name: string }[] }>(
    'GET',
    `/team/${teamId}/space`,
    token
  )
  return res.spaces?.map((s) => ({ id: s.id, name: s.name })) ?? []
}

export async function fetchFolders(token: string, spaceId: string): Promise<ClickUpFolder[]> {
  const res = await clickupFetch<{ folders: { id: string; name: string; lists: { id: string; name: string }[] }[] }>(
    'GET',
    `/space/${spaceId}/folder`,
    token
  )
  return (
    res.folders?.map((f) => ({
      id: f.id,
      name: f.name,
      lists: f.lists?.map((l) => ({ id: l.id, name: l.name })) ?? [],
    })) ?? []
  )
}

export async function fetchFolderlessLists(token: string, spaceId: string): Promise<ClickUpList[]> {
  const res = await clickupFetch<{ lists: { id: string; name: string }[] }>(
    'GET',
    `/space/${spaceId}/list`,
    token
  )
  return res.lists?.map((l) => ({ id: l.id, name: l.name })) ?? []
}

// --- Tasks ---

export async function fetchTasks(token: string, listId: string): Promise<ClickUpApiTask[]> {
  const res = await clickupFetch<{ tasks: ClickUpApiTask[] }>(
    'GET',
    `/list/${listId}/task?include_closed=true&subtasks=true`,
    token
  )
  return res.tasks ?? []
}

export async function createTask(
  token: string,
  listId: string,
  task: { name: string; description?: string; priority?: number; due_date?: number }
): Promise<ClickUpApiTask> {
  return clickupFetch<ClickUpApiTask>('POST', `/list/${listId}/task`, token, task)
}

export async function updateTask(
  token: string,
  taskId: string,
  updates: { name?: string; description?: string; status?: string; priority?: number; due_date?: number }
): Promise<ClickUpApiTask> {
  return clickupFetch<ClickUpApiTask>('PUT', `/task/${taskId}`, token, updates)
}

export async function deleteTask(token: string, taskId: string): Promise<void> {
  await clickupFetch<unknown>('DELETE', `/task/${taskId}`, token)
}
