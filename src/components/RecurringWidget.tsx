import { getNextDueDate } from '../lib/recurring/recurrence'
import type { RecurringTemplate, ViewType } from '../types'

interface RecurringWidgetProps {
  templates: RecurringTemplate[]
  enabledCount: number
  onNavigate: (view: ViewType) => void
}

export function RecurringWidget({ templates, enabledCount, onNavigate }: RecurringWidgetProps) {
  const enabled = templates.filter((t) => t.enabled)

  // Get upcoming tasks sorted by next due date
  const upcoming = enabled
    .map((t) => ({
      template: t,
      nextDue: getNextDueDate(t.recurrence_rule, new Date()),
    }))
    .sort((a, b) => a.nextDue.getTime() - b.nextDue.getTime())
    .slice(0, 5)

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const formatDue = (date: Date) => {
    const d = new Date(date)
    d.setHours(0, 0, 0, 0)
    const diff = Math.round((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

    if (diff === 0) return 'Today'
    if (diff === 1) return 'Tomorrow'
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Recurring</h2>
        <button
          onClick={() => onNavigate('templates')}
          className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          {enabledCount} active
        </button>
      </div>

      {upcoming.length === 0 ? (
        <p className="text-sm text-gray-400">
          No recurring templates.{' '}
          <button
            onClick={() => onNavigate('templates')}
            className="text-blue-600 hover:text-blue-700 cursor-pointer"
          >
            Create one
          </button>
        </p>
      ) : (
        <div className="space-y-2">
          {upcoming.map(({ template: t, nextDue }) => {
            const dueLabel = formatDue(nextDue)
            const isToday = dueLabel === 'Today'
            const isTomorrow = dueLabel === 'Tomorrow'

            return (
              <div
                key={t.id}
                className="flex items-center justify-between py-1.5 text-sm"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-gray-400">
                    {t.recurrence_rule.type === 'daily' ? '📆' : t.recurrence_rule.type === 'weekly' ? '📅' : '🗓️'}
                  </span>
                  <span className="text-gray-800 truncate">{t.title}</span>
                </div>
                <span
                  className={`text-xs shrink-0 ml-2 px-2 py-0.5 rounded-full ${
                    isToday
                      ? 'bg-amber-50 text-amber-700'
                      : isTomorrow
                        ? 'bg-blue-50 text-blue-700'
                        : 'bg-gray-50 text-gray-500'
                  }`}
                >
                  {dueLabel}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
