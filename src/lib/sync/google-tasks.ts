import type { GoogleTaskList, GoogleTask } from '../../types'

const BASE_URL = 'https://www.googleapis.com/tasks/v1'

async function apiFetch<T>(path: string, accessToken: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Google Tasks API error ${res.status}: ${body}`)
  }

  return res.json()
}

export async function fetchAllTaskLists(accessToken: string): Promise<GoogleTaskList[]> {
  const data = await apiFetch<{ items?: GoogleTaskList[] }>('/users/@me/lists', accessToken)
  return data.items ?? []
}

export async function fetchTasksFromList(
  accessToken: string,
  listId: string
): Promise<GoogleTask[]> {
  const allTasks: GoogleTask[] = []
  let pageToken: string | undefined

  do {
    const params = new URLSearchParams({
      showCompleted: 'false',
      showHidden: 'false',
      maxResults: '100',
    })
    if (pageToken) params.set('pageToken', pageToken)

    const data = await apiFetch<{ items?: GoogleTask[]; nextPageToken?: string }>(
      `/lists/${listId}/tasks?${params}`,
      accessToken
    )

    if (data.items) allTasks.push(...data.items)
    pageToken = data.nextPageToken
  } while (pageToken)

  return allTasks
}

export async function markTaskComplete(
  accessToken: string,
  listId: string,
  taskId: string
): Promise<void> {
  await apiFetch(`/lists/${listId}/tasks/${taskId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'completed' }),
  })
}

export async function updateTaskDueDate(
  accessToken: string,
  listId: string,
  taskId: string,
  dueDate: string
): Promise<void> {
  await apiFetch(`/lists/${listId}/tasks/${taskId}`, accessToken, {
    method: 'PATCH',
    body: JSON.stringify({ due: new Date(dueDate).toISOString() }),
  })
}

export async function deleteTask(
  accessToken: string,
  listId: string,
  taskId: string
): Promise<void> {
  const res = await fetch(`${BASE_URL}/lists/${listId}/tasks/${taskId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  })
  if (!res.ok && res.status !== 204) {
    const body = await res.text()
    throw new Error(`Google Tasks API error ${res.status}: ${body}`)
  }
}

export async function moveTaskPosition(
  accessToken: string,
  listId: string,
  taskId: string,
  previousTaskId?: string
): Promise<void> {
  const params = new URLSearchParams()
  if (previousTaskId) params.set('previous', previousTaskId)
  await apiFetch(`/lists/${listId}/tasks/${taskId}/move?${params}`, accessToken, {
    method: 'POST',
  })
}

export async function createTask(
  accessToken: string,
  listId: string,
  task: { title: string; notes?: string; due?: string }
): Promise<GoogleTask> {
  return apiFetch<GoogleTask>(`/lists/${listId}/tasks`, accessToken, {
    method: 'POST',
    body: JSON.stringify({
      title: task.title,
      notes: task.notes,
      due: task.due ? new Date(task.due).toISOString() : undefined,
    }),
  })
}
