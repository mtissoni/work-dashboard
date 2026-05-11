import type { TaskEnrichment } from '../types'
import { isOverdue, isDueToday } from './date-helpers'

function sortScore(task: TaskEnrichment): number {
  const overdue = isOverdue(task.due_date)
  const today = isDueToday(task.due_date)
  const highPriority = task.priority === 'High'
  const lowEffort = task.effort === 'Low'

  if (overdue && highPriority) return 0
  if (overdue) return 1
  if (today) return 2
  if (highPriority) return 3
  if (lowEffort) return 4
  return 5
}

export function sortByPriority(tasks: TaskEnrichment[]): TaskEnrichment[] {
  return [...tasks].sort((a, b) => {
    const scoreDiff = sortScore(a) - sortScore(b)
    if (scoreDiff !== 0) return scoreDiff

    if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
    if (a.due_date) return -1
    if (b.due_date) return 1
    return 0
  })
}
