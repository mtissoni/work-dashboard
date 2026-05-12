import type { ClickUpTaskRow, ViewType } from '../types'

interface ClickUpWidgetProps {
  tasks: ClickUpTaskRow[]
  connected: boolean
  selectedListName: string | null
  onNavigate: (view: ViewType) => void
}

export function ClickUpWidget({
  tasks,
  connected,
  selectedListName,
  onNavigate,
}: ClickUpWidgetProps) {
  // Sort by priority (1=Urgent first) then by due date
  const sorted = [...tasks]
    .sort((a, b) => {
      const pa = a.priority_val ?? 99
      const pb = b.priority_val ?? 99
      if (pa !== pb) return pa - pb
      const da = a.due_date ? new Date(a.due_date).getTime() : Infinity
      const db = b.due_date ? new Date(b.due_date).getTime() : Infinity
      return da - db
    })
    .slice(0, 4)

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    normal: 'bg-blue-100 text-blue-700',
    low: 'bg-gray-100 text-gray-500',
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">ClickUp</h2>
        <button
          onClick={() => onNavigate('clickup')}
          className="text-sm text-purple-600 hover:text-purple-700 cursor-pointer"
        >
          {connected ? `${tasks.length} tasks` : 'Connect'}
        </button>
      </div>

      {!connected ? (
        <p className="text-sm text-gray-400">
          <button
            onClick={() => onNavigate('clickup')}
            className="text-purple-600 hover:text-purple-700 cursor-pointer"
          >
            Connect ClickUp
          </button>{' '}
          to see your tasks here.
        </p>
      ) : sorted.length === 0 ? (
        <p className="text-sm text-gray-400">
          {selectedListName ? 'No tasks in this list.' : 'Select a list to see tasks.'}
        </p>
      ) : (
        <div className="space-y-2">
          {selectedListName && (
            <p className="text-xs text-gray-400 mb-2">{selectedListName}</p>
          )}
          {sorted.map((task) => {
            const dueDate = task.due_date
              ? new Date(task.due_date).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })
              : null

            return (
              <div key={task.id} className="flex items-center justify-between py-1.5 text-sm">
                <div className="flex items-center gap-2 min-w-0">
                  {task.status_color && (
                    <span
                      className="w-2 h-2 rounded-full shrink-0"
                      style={{ backgroundColor: task.status_color }}
                    />
                  )}
                  <span className="text-gray-800 truncate">{task.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0 ml-2">
                  {task.priority_label && (
                    <span
                      className={`text-xs px-1.5 py-0.5 rounded-full ${
                        priorityColors[task.priority_label.toLowerCase()] ?? 'bg-gray-100 text-gray-500'
                      }`}
                    >
                      {task.priority_label}
                    </span>
                  )}
                  {dueDate && (
                    <span className="text-xs text-gray-400">{dueDate}</span>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
