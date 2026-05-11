import type { TaskEnrichment } from '../types'
import { TaskTable } from '../components/TaskTable'
import { isOverdue } from '../utils/date-helpers'
import { sortByPriority } from '../utils/priority-sort'

interface OverdueViewProps {
  tasks: TaskEnrichment[]
  onUpdate: Parameters<typeof TaskTable>[0]['onUpdate']
  onMarkComplete: (task: TaskEnrichment) => void
  onChangeDueDate: (task: TaskEnrichment, newDate: string) => void
  onSelectTask: (task: TaskEnrichment) => void
}

export function OverdueView({ tasks, onUpdate, onMarkComplete, onChangeDueDate, onSelectTask }: OverdueViewProps) {
  const overdueTasks = sortByPriority(tasks.filter((t) => isOverdue(t.due_date)))

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Overdue Tasks</h1>
        <p className="text-sm text-gray-500 mt-1">
          {overdueTasks.length} tasks past their due date. Reschedule, complete, or remove.
        </p>
      </div>
      <TaskTable
        tasks={overdueTasks}
        onUpdate={onUpdate}
        onMarkComplete={onMarkComplete}
        onChangeDueDate={onChangeDueDate}
        onSelectTask={onSelectTask}
        emptyMessage="No overdue tasks. Nice work!"
      />
    </div>
  )
}
