import type { TaskEnrichment } from '../types'
import { CATEGORIES } from '../types'
import { TaskTable } from '../components/TaskTable'
import { sortByPriority } from '../utils/priority-sort'

interface ByCategoryViewProps {
  tasks: TaskEnrichment[]
  onUpdate: Parameters<typeof TaskTable>[0]['onUpdate']
  onMarkComplete: (task: TaskEnrichment) => void
  onChangeDueDate: (task: TaskEnrichment, newDate: string) => void
  onSelectTask: (task: TaskEnrichment) => void
}

export function ByCategoryView({ tasks, onUpdate, onMarkComplete, onChangeDueDate, onSelectTask }: ByCategoryViewProps) {
  const uncategorized = sortByPriority(tasks.filter((t) => !t.category))

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">By Category</h1>
        <p className="text-sm text-gray-500 mt-1">Tasks grouped by category</p>
      </div>

      {CATEGORIES.map((category) => {
        const categoryTasks = sortByPriority(tasks.filter((t) => t.category === category))
        if (categoryTasks.length === 0) return null

        return (
          <div key={category} className="space-y-2">
            <h2 className="text-lg font-medium text-gray-800 border-b border-gray-200 pb-1">
              {category}{' '}
              <span className="text-sm text-gray-400 font-normal">({categoryTasks.length})</span>
            </h2>
            <TaskTable
              tasks={categoryTasks}
              onUpdate={onUpdate}
              onMarkComplete={onMarkComplete}
              onChangeDueDate={onChangeDueDate}
              onSelectTask={onSelectTask}
            />
          </div>
        )
      })}

      {uncategorized.length > 0 && (
        <div className="space-y-2">
          <h2 className="text-lg font-medium text-gray-500 border-b border-gray-200 pb-1">
            Uncategorized{' '}
            <span className="text-sm text-gray-400 font-normal">({uncategorized.length})</span>
          </h2>
          <TaskTable
            tasks={uncategorized}
            onUpdate={onUpdate}
            onMarkComplete={onMarkComplete}
            onChangeDueDate={onChangeDueDate}
            onSelectTask={onSelectTask}
          />
        </div>
      )}
    </div>
  )
}
