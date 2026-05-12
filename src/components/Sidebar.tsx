import type { ViewType } from '../types'

interface SidebarProps {
  currentView: ViewType
  onNavigate: (view: ViewType) => void
  onSync: () => void
  onSignOut: () => void
  isSyncing: boolean
  lastSyncedAt: Date | null
}

const NAV_ITEMS: { view: ViewType; label: string; icon: string }[] = [
  { view: 'dashboard', label: 'Dashboard', icon: '🏠' },
  { view: 'inbox', label: 'Inbox', icon: '📧' },
  { view: 'news', label: 'AI News', icon: '📰' },
  { view: 'calendar', label: 'Calendar', icon: '📅' },
  { view: 'templates', label: 'Recurring', icon: '🔁' },
  { view: 'clickup', label: 'ClickUp', icon: '🟣' },
  { view: 'lists', label: 'My Lists', icon: '✅' },
  { view: 'today', label: 'Today / Next Up', icon: '☀️' },
  { view: 'all', label: 'All Tasks', icon: '📋' },
  { view: 'overdue', label: 'Overdue', icon: '⚠️' },
  { view: 'category', label: 'By Category', icon: '🏷️' },
]

export function Sidebar({
  currentView,
  onNavigate,
  onSync,
  onSignOut,
  isSyncing,
  lastSyncedAt,
}: SidebarProps) {
  return (
    <aside className="w-60 bg-gray-900 text-gray-300 flex flex-col h-screen sticky top-0">
      <div className="p-4 border-b border-gray-700">
        <h2 className="text-lg font-semibold text-white">Work Dashboard</h2>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {NAV_ITEMS.map(({ view, label, icon }) => (
          <button
            key={view}
            onClick={() => onNavigate(view)}
            className={`w-full text-left px-3 py-2 rounded-md text-sm flex items-center gap-2 transition-colors cursor-pointer ${
              currentView === view
                ? 'bg-gray-700 text-white'
                : 'hover:bg-gray-800 hover:text-white'
            }`}
          >
            <span>{icon}</span>
            {label}
          </button>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-700 space-y-2">
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded-md text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
        >
          {isSyncing ? 'Syncing...' : 'Sync All'}
        </button>

        {lastSyncedAt && (
          <p className="text-xs text-gray-500 text-center">
            Last synced: {lastSyncedAt.toLocaleTimeString()}
          </p>
        )}

        <button
          onClick={onSignOut}
          className="w-full px-3 py-2 text-gray-400 hover:text-white text-sm transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
