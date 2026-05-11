import type { TaskEnrichment, TaskFilters } from '../types'
import { TaskTable } from '../components/TaskTable'
import { FilterBar } from '../components/FilterBar'
import { sortByPriority } from '../utils/priority-sort'

interface AllTasksViewProps {
  tasks: TaskEnrichment[]
  sourceListOptions: string[]
  onUpdate: Parameters<typeof TaskTable>[0]['onUpdate']
  onMarkComplete: (task: TaskEnrichment) => void
  onChangeDueDate: (task: TaskEnrichment, newDate: string) => void
  onSelectTask: (task: TaskEnrichment) => void
  filters: TaskFilters
  onFiltersChange: (filters: TaskFilters) => void
}

export function AllTasksView({
  tasks,
  sourceListOptions,
  onUpdate,
  onMarkComplete,
  onChangeDueDate,
  onSelectTask,
  filters,
  onFiltersChange,
}: AllTasksViewProps) {
  const sorted = sortByPriority(tasks)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">All Active Tasks</h1>
        <p className="text-sm text-gray-500 mt-1">{tasks.length} active tasks</p>
      </div>
      <FilterBar
        filters={filters}
        onFiltersChange={onFiltersChange}
        sourceListOptions={sourceListOptions}
      />
      <TaskTable
        tasks={sorted}
        onUpdate={onUpdate}
        onMarkComplete={onMarkComplete}
        onChangeDueDate={onChangeDueDate}
        onSelectTask={onSelectTask}
        emptyMessage="No tasks match your filters."
      />
    </div>
  )
}
