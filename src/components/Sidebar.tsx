import type { ViewType } from '../types'

interface SidebarProps {
  currentView: ViewType
  onNavigate: (view: ViewType) => void
  onSync: () => void
  onSignOut: () => void
  isSyncing: boolean
  lastSyncedAt: Date | null
}

type NavItem = { view: ViewType; label: string; icon: string }
type NavSection = { heading: string; items: NavItem[] }

const NAV_SECTIONS: NavSection[] = [
  {
    heading: 'Overview',
    items: [
      { view: 'dashboard', label: 'Dashboard', icon: '🏠' },
      { view: 'calendar', label: 'Calendar', icon: '📅' },
      { view: 'inbox', label: 'Inbox', icon: '📧' },
      { view: 'news', label: 'AI News', icon: '📰' },
    ],
  },
  {
    heading: 'Tasks',
    items: [
      { view: 'lists', label: 'My Lists', icon: '✅' },
      { view: 'templates', label: 'Recurring', icon: '🔁' },
    ],
  },
  {
    heading: 'Tools',
    items: [
      { view: 'clickup', label: 'ClickUp', icon: '🟣' },
    ],
  },
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
    <aside className="w-56 bg-gray-950 text-gray-400 flex flex-col h-screen sticky top-0">
      <div className="px-4 py-4 border-b border-white/5">
        <h2 className="text-sm font-bold text-white tracking-wide uppercase">Claudio</h2>
      </div>

      <nav className="flex-1 px-2 py-3 overflow-y-auto space-y-5">
        {NAV_SECTIONS.map(({ heading, items }) => (
          <div key={heading}>
            <p className="px-3 pb-1 text-[10px] font-semibold uppercase tracking-widest text-gray-600">
              {heading}
            </p>
            <div className="space-y-0.5">
              {items.map(({ view, label, icon }) => (
                <button
                  key={view}
                  onClick={() => onNavigate(view)}
                  className={`w-full text-left px-3 py-2 rounded-lg text-sm flex items-center gap-2.5 transition-colors cursor-pointer ${
                    currentView === view
                      ? 'bg-white/10 text-white font-medium'
                      : 'text-gray-400 hover:bg-white/5 hover:text-gray-200'
                  }`}
                >
                  <span className="text-base leading-none opacity-80">{icon}</span>
                  {label}
                </button>
              ))}
            </div>
          </div>
        ))}
      </nav>

      <div className="px-3 py-3 border-t border-white/5 space-y-2">
        <button
          onClick={onSync}
          disabled={isSyncing}
          className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-500 disabled:opacity-40 transition-colors cursor-pointer font-medium"
        >
          {isSyncing ? 'Syncing...' : 'Sync All'}
        </button>

        {lastSyncedAt && (
          <p className="text-[10px] text-gray-600 text-center">
            {lastSyncedAt.toLocaleTimeString()}
          </p>
        )}

        <button
          onClick={onSignOut}
          className="w-full px-3 py-1.5 text-gray-600 hover:text-gray-300 text-xs transition-colors cursor-pointer"
        >
          Sign out
        </button>
      </div>
    </aside>
  )
}
