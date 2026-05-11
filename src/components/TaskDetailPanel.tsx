import type { TaskEnrichment, Category, Priority, Effort, StatusCustom } from '../types'
import { CATEGORIES, PRIORITIES, EFFORTS, STATUSES } from '../types'
import { formatDate, isOverdue, isDueToday } from '../utils/date-helpers'

interface TaskDetailPanelProps {
  task: TaskEnrichment
  onClose: () => void
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
}

export function TaskDetailPanel({ task, onClose, onUpdate, onMarkComplete }: TaskDetailPanelProps) {
  const overdue = isOverdue(task.due_date)
  const today = isDueToday(task.due_date)

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-md bg-white shadow-xl overflow-y-auto">
        <div className="p-6 space-y-5">
          <div className="flex justify-between items-start">
            <h2 className="text-xl font-semibold text-gray-900 pr-4">{task.title ?? 'Untitled'}</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer">
              ×
            </button>
          </div>

          {task.list_name && (
            <p className="text-sm text-gray-500">Source: {task.list_name}</p>
          )}

          {task.due_date && (
            <p className={`text-sm ${overdue ? 'text-red-600 font-medium' : today ? 'text-amber-600' : 'text-gray-600'}`}>
              Due: {formatDate(task.due_date)}
              {overdue && ' (Overdue)'}
              {today && ' (Today)'}
            </p>
          )}

          {task.notes && (
            <div>
              <label className="text-xs font-medium text-gray-500 uppercase">Notes</label>
              <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">{task.notes}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <FieldSelect
              label="Category"
              value={task.category}
              options={CATEGORIES}
              onChange={(v) => onUpdate(task.id, { category: v as Category | null })}
            />
            <FieldSelect
              label="Priority"
              value={task.priority}
              options={PRIORITIES}
              onChange={(v) => onUpdate(task.id, { priority: v as Priority | null })}
            />
            <FieldSelect
              label="Effort"
              value={task.effort}
              options={EFFORTS}
              onChange={(v) => onUpdate(task.id, { effort: v as Effort | null })}
            />
            <FieldSelect
              label="Status"
              value={task.status_custom}
              options={STATUSES}
              onChange={(v) => onUpdate(task.id, { status_custom: (v ?? 'Not Started') as StatusCustom })}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Next Action</label>
            <input
              type="text"
              value={task.next_action ?? ''}
              onChange={(e) => onUpdate(task.id, { next_action: e.target.value || null })}
              placeholder="What's the next step?"
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="text-xs font-medium text-gray-500 uppercase">Related Entity</label>
            <input
              type="text"
              value={task.related_entity ?? ''}
              onChange={(e) => onUpdate(task.id, { related_entity: e.target.value || null })}
              placeholder="Client, project, person..."
              className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <button
            onClick={() => onMarkComplete(task)}
            className="w-full px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors cursor-pointer"
          >
            Mark Complete
          </button>
        </div>
      </div>
    </div>
  )
}

function FieldSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string | null
  options: readonly string[]
  onChange: (v: string | null) => void
}) {
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 uppercase">{label}</label>
      <select
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value || null)}
        className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md text-sm bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500"
      >
        <option value="">—</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>
            {opt}
          </option>
        ))}
      </select>
    </div>
  )
}
