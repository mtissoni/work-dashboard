import type { TaskEnrichment, Category, Priority, Effort, StatusCustom } from '../types'
import { CATEGORIES, PRIORITIES, EFFORTS, STATUSES } from '../types'
import { isOverdue, isDueToday, daysOverdue } from '../utils/date-helpers'

interface TaskRowProps {
  task: TaskEnrichment
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
  onSelect: (task: TaskEnrichment) => void
}

export function TaskRow({ task, onUpdate, onMarkComplete, onChangeDueDate, onSelect }: TaskRowProps) {
  const overdue = isOverdue(task.due_date)
  const today = isDueToday(task.due_date)
  const days = daysOverdue(task.due_date)

  return (
    <tr
      className="border-b border-gray-100 hover:bg-gray-50 transition-colors cursor-pointer"
      onClick={() => onSelect(task)}
    >
      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={() => onMarkComplete(task)}
          className="w-5 h-5 rounded-full border-2 border-gray-300 hover:border-green-500 hover:bg-green-50 transition-colors cursor-pointer flex-shrink-0"
          title="Mark complete"
        />
      </td>

      <td className="px-3 py-2">
        <div className="flex flex-col">
          <span className={`text-sm font-medium ${task.priority === 'High' ? 'text-gray-900 font-semibold' : 'text-gray-700'}`}>
            {task.title ?? 'Untitled'}
          </span>
          {task.list_name && (
            <span className="text-xs text-gray-400">{task.list_name}</span>
          )}
        </div>
      </td>

      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-1">
          <input
            type="date"
            value={task.due_date ?? ''}
            onChange={(e) => onChangeDueDate(task, e.target.value)}
            className={`text-xs px-1.5 py-0.5 border rounded w-32 ${
              overdue
                ? 'text-red-600 border-red-200 bg-red-50'
                : today
                ? 'text-amber-600 border-amber-200 bg-amber-50'
                : 'border-gray-200'
            }`}
          />
          {overdue && (
            <span className="text-xs text-red-500 whitespace-nowrap">{days}d late</span>
          )}
        </div>
      </td>

      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <InlineSelect
          value={task.category}
          options={CATEGORIES}
          onChange={(v) => onUpdate(task.id, { category: v as Category | null })}
          colorMap={CATEGORY_COLORS}
        />
      </td>

      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <InlineSelect
          value={task.priority}
          options={PRIORITIES}
          onChange={(v) => onUpdate(task.id, { priority: v as Priority | null })}
          colorMap={PRIORITY_COLORS}
        />
      </td>

      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <InlineSelect
          value={task.effort}
          options={EFFORTS}
          onChange={(v) => onUpdate(task.id, { effort: v as Effort | null })}
        />
      </td>

      <td className="px-3 py-2" onClick={(e) => e.stopPropagation()}>
        <InlineSelect
          value={task.status_custom}
          options={STATUSES}
          onChange={(v) => onUpdate(task.id, { status_custom: (v ?? 'Not Started') as StatusCustom })}
          colorMap={STATUS_COLORS}
        />
      </td>
    </tr>
  )
}

function InlineSelect({
  value,
  options,
  onChange,
  colorMap,
}: {
  value: string | null
  options: readonly string[]
  onChange: (v: string | null) => void
  colorMap?: Record<string, string>
}) {
  const colorClass = value && colorMap?.[value] ? colorMap[value] : 'bg-gray-100 text-gray-600'

  return (
    <select
      value={value ?? ''}
      onChange={(e) => onChange(e.target.value || null)}
      className={`text-xs px-2 py-1 rounded-full border-0 cursor-pointer appearance-auto ${colorClass}`}
    >
      <option value="">—</option>
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}

const CATEGORY_COLORS: Record<string, string> = {
  Client: 'bg-blue-100 text-blue-700',
  Internal: 'bg-purple-100 text-purple-700',
  Sales: 'bg-green-100 text-green-700',
  'AI Studio': 'bg-indigo-100 text-indigo-700',
  Content: 'bg-pink-100 text-pink-700',
  Admin: 'bg-gray-100 text-gray-700',
  Personal: 'bg-yellow-100 text-yellow-700',
  Other: 'bg-gray-100 text-gray-600',
}

const PRIORITY_COLORS: Record<string, string> = {
  High: 'bg-red-100 text-red-700',
  Medium: 'bg-amber-100 text-amber-700',
  Low: 'bg-green-100 text-green-700',
}

const STATUS_COLORS: Record<string, string> = {
  'Not Started': 'bg-gray-100 text-gray-600',
  'In Progress': 'bg-blue-100 text-blue-700',
  Waiting: 'bg-amber-100 text-amber-700',
  Blocked: 'bg-red-100 text-red-700',
  Done: 'bg-green-100 text-green-700',
}
