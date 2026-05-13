import type { TaskEnrichment, Category, Priority, Effort, StatusCustom } from '../types'
import { TaskRow } from './TaskRow'

interface TaskTableProps {
  tasks: TaskEnrichment[]
  onUpdate: (
    taskId: string,
    updates: Partial<{
      category: Category | null
      priority: Priority | null
      effort: Effort | null
      status_custom: StatusCustom
      next_action: string | null
      related_entity: string | null
    }>
  ) => Promise<boolean>
  onMarkComplete: (task: TaskEnrichment) => void
  onChangeDueDate: (task: TaskEnrichment, newDate: string) => void
  onSelectTask: (task: TaskEnrichment) => void
  emptyMessage?: string
}

export function TaskTable({
  tasks,
  onUpdate,
  onMarkComplete,
  onChangeDueDate,
  onSelectTask,
  emptyMessage = 'No tasks found.',
}: TaskTableProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-400">
        <p className="text-lg">{emptyMessage}</p>
      </div>
    )
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left">
        <thead>
          <tr className="border-b border-gray-100 text-[11px] text-gray-400 uppercase tracking-wider bg-gray-50/60">
            <th className="px-3 py-2 w-10"></th>
            <th className="px-3 py-2">Task</th>
            <th className="px-3 py-2 w-40">Due Date</th>
            <th className="px-3 py-2 w-28">Category</th>
            <th className="px-3 py-2 w-24">Priority</th>
            <th className="px-3 py-2 w-24">Effort</th>
            <th className="px-3 py-2 w-28">Status</th>
          </tr>
        </thead>
        <tbody>
          {tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onUpdate={onUpdate}
              onMarkComplete={onMarkComplete}
              onChangeDueDate={onChangeDueDate}
              onSelect={onSelectTask}
            />
          ))}
        </tbody>
      </table>
    </div>
  )
}
