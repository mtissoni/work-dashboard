import type { TaskEnrichment } from '../types'
import { TaskTable } from '../components/TaskTable'
import { isOverdue, isDueToday } from '../utils/date-helpers'
import { sortByPriority } from '../utils/priority-sort'

interface TodayViewProps {
  tasks: TaskEnrichment[]
  onUpdate: Parameters<typeof TaskTable>[0]['onUpdate']
  onMarkComplete: (task: TaskEnrichment) => void
  onChangeDueDate: (task: TaskEnrichment, newDate: string) => void
  onSelectTask: (task: TaskEnrichment) => void
}

export function TodayView({ tasks, onUpdate, onMarkComplete, onChangeDueDate, onSelectTask }: TodayViewProps) {
  const todayTasks = sortByPriority(
    tasks.filter(
      (t) =>
        isOverdue(t.due_date) ||
        isDueToday(t.due_date) ||
        t.priority === 'High'
    )
  )

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Today / Next Up</h1>
        <p className="text-sm text-gray-500 mt-1">
          Overdue, due today, and high-priority tasks. {todayTasks.length} tasks need attention.
        </p>
      </div>
      <TaskTable
        tasks={todayTasks}
        onUpdate={onUpdate}
        onMarkComplete={onMarkComplete}
        onChangeDueDate={onChangeDueDate}
        onSelectTask={onSelectTask}
        emptyMessage="Nothing urgent. You're all caught up!"
      />
    </div>
  )
}
