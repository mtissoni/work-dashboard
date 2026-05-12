import { supabase } from '../supabase'
import { fetchTasks } from './clickup-api'
import type { ClickUpApiTask } from './clickup-api'

export interface ClickUpSyncResult {
  taskCount: number
  status: 'success' | 'error'
  error?: string
}

/**
 * Syncs tasks from a single ClickUp list into the clickup_task cache.
 */
export async function syncClickUpTasks(
  clickupToken: string,
  userId: string,
  listId: string
): Promise<ClickUpSyncResult> {
  try {
    const tasks = await fetchTasks(clickupToken, listId)

    if (tasks.length === 0) {
      return { taskCount: 0, status: 'success' }
    }

    const rows = tasks.map((t: ClickUpApiTask) => ({
      user_id: userId,
      clickup_id: t.id,
      list_id: t.list?.id ?? listId,
      list_name: t.list?.name ?? null,
      folder_name: t.folder?.name ?? null,
      space_name: null, // space name not included in task response
      name: t.name,
      description: t.description ?? null,
      status_name: t.status?.status ?? null,
      status_color: t.status?.color ?? null,
      priority_val: t.priority ? Number(t.priority.id) : null,
      priority_label: t.priority?.priority ?? null,
      assignees: t.assignees ?? [],
      tags: t.tags ?? [],
      due_date: t.due_date ? new Date(Number(t.due_date)).toISOString() : null,
      date_created: t.date_created ? new Date(Number(t.date_created)).toISOString() : null,
      date_updated: t.date_updated ? new Date(Number(t.date_updated)).toISOString() : null,
      url: t.url ?? null,
    }))

    const { error } = await supabase
      .from('clickup_task')
      .upsert(rows, { onConflict: 'user_id,clickup_id' })

    if (error) {
      return { taskCount: 0, status: 'error', error: error.message }
    }

    // Remove tasks that no longer exist in ClickUp for this list
    const clickupIds = tasks.map((t) => t.id)
    await supabase
      .from('clickup_task')
      .delete()
      .eq('user_id', userId)
      .eq('list_id', listId)
      .not('clickup_id', 'in', `(${clickupIds.join(',')})`)

    return { taskCount: tasks.length, status: 'success' }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    return { taskCount: 0, status: 'error', error: msg }
  }
}
