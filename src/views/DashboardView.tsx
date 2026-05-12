import type { TaskEnrichment, EmailCacheRow, FeedItem, CalendarEvent, RecurringTemplate, ClickUpTaskRow, ViewType } from '../types'
import { EmailTriageWidget } from '../components/EmailTriageWidget'
import { NewsWidget } from '../components/NewsWidget'
import { CalendarWidget } from '../components/CalendarWidget'
import { RecurringWidget } from '../components/RecurringWidget'
import { ClickUpWidget } from '../components/ClickUpWidget'
import { isOverdue, isDueToday } from '../utils/date-helpers'

interface DashboardViewProps {
  tasks: TaskEnrichment[]
  actionableEmails: EmailCacheRow[]
  totalEmailCount: number
  todayVideo: FeedItem | null
  todayArticle: FeedItem | null
  newsUnreadCount: number
  todayEvents: CalendarEvent[]
  nextEvent: CalendarEvent | null
  recurringTemplates: RecurringTemplate[]
  recurringEnabledCount: number
  clickUpTasks: ClickUpTaskRow[]
  clickUpConnected: boolean
  clickUpListName: string | null
  onNavigate: (view: ViewType) => void
  onSync: () => void
  onMarkNewsRead: (id: string) => void
  isSyncing: boolean
}

export function DashboardView({
  tasks,
  actionableEmails,
  totalEmailCount,
  todayVideo,
  todayArticle,
  newsUnreadCount,
  todayEvents,
  nextEvent,
  recurringTemplates,
  recurringEnabledCount,
  clickUpTasks,
  clickUpConnected,
  clickUpListName,
  onNavigate,
  onSync,
  onMarkNewsRead,
  isSyncing,
}: DashboardViewProps) {
  const overdueCount = tasks.filter((t) => isOverdue(t.due_date)).length
  const dueTodayCount = tasks.filter((t) => isDueToday(t.due_date)).length
  const highPriorityCount = tasks.filter((t) => t.priority === 'High').length
  const inProgressCount = tasks.filter((t) => t.status_custom === 'In Progress').length

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">{greeting}, Marcelo</h1>
        <p className="text-sm text-gray-500 mt-1">
          Here's what needs your attention today.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Task Summary */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900">Tasks</h2>
            <button
              onClick={() => onNavigate('all')}
              className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
            >
              View All
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <SummaryCard
              count={overdueCount}
              label="Overdue"
              color="red"
              onClick={() => onNavigate('overdue')}
            />
            <SummaryCard
              count={dueTodayCount}
              label="Due Today"
              color="amber"
              onClick={() => onNavigate('today')}
            />
            <SummaryCard
              count={highPriorityCount}
              label="High Priority"
              color="purple"
              onClick={() => onNavigate('today')}
            />
            <SummaryCard
              count={inProgressCount}
              label="In Progress"
              color="blue"
              onClick={() => onNavigate('all')}
            />
          </div>
        </div>

        {/* Calendar Widget */}
        <CalendarWidget
          todayEvents={todayEvents}
          nextEvent={nextEvent}
          onNavigate={onNavigate}
        />

        {/* Recurring Widget */}
        <RecurringWidget
          templates={recurringTemplates}
          enabledCount={recurringEnabledCount}
          onNavigate={onNavigate}
        />

        {/* ClickUp Widget */}
        <ClickUpWidget
          tasks={clickUpTasks}
          connected={clickUpConnected}
          selectedListName={clickUpListName}
          onNavigate={onNavigate}
        />

        {/* Email Triage Widget */}
        <EmailTriageWidget
          actionableEmails={actionableEmails}
          totalCount={totalEmailCount}
          onNavigate={onNavigate}
        />
      </div>

      {/* AI News Widget */}
      <NewsWidget
        todayVideo={todayVideo}
        todayArticle={todayArticle}
        unreadCount={newsUnreadCount}
        onNavigate={onNavigate}
        onMarkRead={onMarkNewsRead}
      />

      {/* Quick Actions */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider mb-3">
          Quick Actions
        </h2>
        <div className="flex flex-wrap gap-2">
          <QuickAction
            label={isSyncing ? 'Syncing...' : 'Sync All'}
            onClick={onSync}
            disabled={isSyncing}
          />
          <QuickAction label="View Tasks" onClick={() => onNavigate('all')} />
          <QuickAction label="View Inbox" onClick={() => onNavigate('inbox')} />
          <QuickAction label="My Lists" onClick={() => onNavigate('lists')} />
          <QuickAction label="AI News" onClick={() => onNavigate('news')} />
        </div>
      </div>
    </div>
  )
}

function SummaryCard({
  count,
  label,
  color,
  onClick,
}: {
  count: number
  label: string
  color: 'red' | 'amber' | 'purple' | 'blue'
  onClick: () => void
}) {
  const colorStyles = {
    red: 'bg-red-50 text-red-700 border-red-100',
    amber: 'bg-amber-50 text-amber-700 border-amber-100',
    purple: 'bg-purple-50 text-purple-700 border-purple-100',
    blue: 'bg-blue-50 text-blue-700 border-blue-100',
  }

  return (
    <button
      onClick={onClick}
      className={`p-3 rounded-lg border text-left transition-all hover:shadow-sm cursor-pointer ${colorStyles[color]}`}
    >
      <div className="text-2xl font-bold">{count}</div>
      <div className="text-xs mt-0.5">{label}</div>
    </button>
  )
}

function QuickAction({
  label,
  onClick,
  disabled,
}: {
  label: string
  onClick: () => void
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
    >
      {label}
    </button>
  )
}
