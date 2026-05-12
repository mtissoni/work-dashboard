import { supabase } from '../supabase'
import { createTask } from '../sync/google-tasks'
import { getDueDates } from './recurrence'
import type { RecurringTemplate } from '../../types'

export interface GenerateResult {
  tasksCreated: number
  errors: string[]
}

/**
 * Checks all enabled recurring templates, creates Google Tasks for any due dates
 * since last generation, logs them, and applies default enrichment after sync.
 */
export async function generateRecurringTasks(
  googleToken: string,
  userId: string
): Promise<GenerateResult> {
  const errors: string[] = []
  let tasksCreated = 0

  // 1. Fetch enabled templates
  const { data: templates, error: fetchErr } = await supabase
    .from('recurring_template')
    .select('*')
    .eq('user_id', userId)
    .eq('enabled', true)

  if (fetchErr || !templates || templates.length === 0) {
    return { tasksCreated: 0, errors: fetchErr ? [fetchErr.message] : [] }
  }

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  // 2. For each template, compute due dates and create tasks
  for (const template of templates as RecurringTemplate[]) {
    const after = template.last_generated_date
      ? new Date(template.last_generated_date)
      : new Date(template.created_at)

    after.setHours(0, 0, 0, 0)

    const dueDates = getDueDates(template.recurrence_rule, after, today)

    for (const dueDate of dueDates) {
      const dueDateStr = toDateString(dueDate)

      try {
        // Create Google Task
        const googleTask = await createTask(googleToken, template.list_id, {
          title: template.title,
          notes: template.notes ?? undefined,
          due: dueDateStr,
        })

        // Log it (idempotent via unique constraint)
        const { error: logErr } = await supabase.from('recurring_task_log').upsert(
          {
            user_id: userId,
            template_id: template.id,
            generated_date: dueDateStr,
            external_id: googleTask.id,
          },
          { onConflict: 'template_id,generated_date' }
        )

        if (logErr) {
          // Unique violation means already generated — skip silently
          if (!logErr.message.includes('duplicate') && !logErr.message.includes('unique')) {
            errors.push(`Log error for ${template.title} on ${dueDateStr}: ${logErr.message}`)
          }
          continue
        }

        tasksCreated++
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        errors.push(`Failed to create task "${template.title}" for ${dueDateStr}: ${msg}`)
      }
    }

    // 3. Update last_generated_date to today
    if (dueDates.length > 0) {
      await supabase
        .from('recurring_template')
        .update({ last_generated_date: toDateString(today) })
        .eq('id', template.id)
    }
  }

  return { tasksCreated, errors }
}

/**
 * After sync pulls new tasks into task_enrichment, apply template defaults
 * (category, priority, effort) to any newly generated tasks.
 */
export async function applyTemplateEnrichment(userId: string): Promise<void> {
  // Find log entries that have matching task_enrichment rows with no enrichment set
  const { data: logs } = await supabase
    .from('recurring_task_log')
    .select('external_id, template_id')
    .eq('user_id', userId)

  if (!logs || logs.length === 0) return

  // Get templates for lookup
  const templateIds = [...new Set(logs.map((l) => l.template_id))]
  const { data: templates } = await supabase
    .from('recurring_template')
    .select('id, category, priority, effort')
    .in('id', templateIds)

  if (!templates) return

  const templateMap = new Map(templates.map((t) => [t.id, t]))

  for (const log of logs) {
    const template = templateMap.get(log.template_id)
    if (!template) continue
    if (!template.category && !template.priority && !template.effort) continue

    // Only update if enrichment fields are still at defaults
    const updates: Record<string, string> = {}
    if (template.category) updates.category = template.category
    if (template.priority) updates.priority = template.priority
    if (template.effort) updates.effort = template.effort

    await supabase
      .from('task_enrichment')
      .update(updates)
      .eq('user_id', userId)
      .eq('external_id', log.external_id)
      .is('category', null) // Only update if not already enriched
  }
}

function toDateString(date: Date): string {
  return date.toISOString().split('T')[0]
}
