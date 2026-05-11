import { supabase } from '../supabase'
import { fetchAllTaskLists, fetchTasksFromList } from './google-tasks'
import type { SyncResult } from './types'

export async function syncGoogleTasks(
  googleToken: string,
  userId: string
): Promise<SyncResult> {
  try {
    const lists = await fetchAllTaskLists(googleToken)
    let totalCount = 0

    for (const list of lists) {
      const tasks = await fetchTasksFromList(googleToken, list.id)

      for (const task of tasks) {
        const { error } = await supabase.from('task_enrichment').upsert(
          {
            user_id: userId,
            source: 'google_tasks',
            external_id: task.id,
            list_id: list.id,
            list_name: list.title,
            title: task.title,
            notes: task.notes ?? null,
            due_date: task.due ? task.due.split('T')[0] : null,
            google_status: task.status,
            google_updated_at: task.updated,
            parent_external_id: task.parent ?? null,
            position: task.position ?? null,
          },
          {
            onConflict: 'user_id,source,external_id',
            ignoreDuplicates: false,
          }
        )

        if (error) {
          console.error('Upsert error for task', task.id, error)
        } else {
          totalCount++
        }
      }
    }

    await supabase.from('sync_log').insert({
      user_id: userId,
      source: 'google_tasks',
      task_count: totalCount,
      status: 'success',
    })

    return { taskCount: totalCount, status: 'success' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown sync error'
    console.error('Sync failed:', message)
    return { taskCount: 0, status: 'error', error: message }
  }
}
