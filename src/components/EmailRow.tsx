import type { EmailCacheRow } from '../types'

interface EmailRowProps {
  email: EmailCacheRow
  onSelect: (email: EmailCacheRow) => void
  onArchive: (email: EmailCacheRow) => void
  onStar: (email: EmailCacheRow) => void
  onMarkRead: (email: EmailCacheRow) => void
}

export function EmailRow({ email, onSelect, onArchive, onStar, onMarkRead }: EmailRowProps) {
  const timeAgo = formatRelativeTime(email.received_at)
  const initial = (email.sender_name ?? email.sender_email ?? '?')[0].toUpperCase()

  return (
    <div
      onClick={() => onSelect(email)}
      className={`flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50 cursor-pointer group transition-colors border-b border-gray-100 ${
        email.is_unread ? 'bg-white' : 'bg-gray-50/50'
      }`}
    >
      {/* Sender avatar */}
      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center text-sm font-medium flex-shrink-0">
        {initial}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span
            className={`text-sm truncate ${
              email.is_unread ? 'font-semibold text-gray-900' : 'text-gray-600'
            }`}
          >
            {email.sender_name ?? email.sender_email ?? 'Unknown'}
          </span>
          <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo}</span>
          {email.is_starred && <span className="text-yellow-400 text-xs">★</span>}
          {email.is_actionable && !email.triaged_at && (
            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 flex-shrink-0" />
          )}
        </div>
        <p
          className={`text-sm truncate ${
            email.is_unread ? 'text-gray-800' : 'text-gray-500'
          }`}
        >
          {email.subject ?? '(no subject)'}
        </p>
        <p className="text-xs text-gray-400 truncate">{email.snippet}</p>
      </div>

      {/* Quick actions (visible on hover) */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
        <button
          onClick={(e) => {
            e.stopPropagation()
            onArchive(email)
          }}
          className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 cursor-pointer"
          title="Archive"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation()
            onStar(email)
          }}
          className={`p-1.5 rounded hover:bg-gray-200 cursor-pointer ${
            email.is_starred ? 'text-yellow-400' : 'text-gray-400 hover:text-gray-600'
          }`}
          title={email.is_starred ? 'Unstar' : 'Star'}
        >
          <svg className="w-4 h-4" fill={email.is_starred ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
          </svg>
        </button>
        {email.is_unread && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onMarkRead(email)
            }}
            className="p-1.5 rounded hover:bg-gray-200 text-gray-400 hover:text-gray-600 cursor-pointer"
            title="Mark as read"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 19v-8.93a2 2 0 01.89-1.664l7-4.666a2 2 0 012.22 0l7 4.666A2 2 0 0121 10.07V19M3 19a2 2 0 002 2h14a2 2 0 002-2M3 19l6.75-4.5M21 19l-6.75-4.5M3 10l6.75 4.5M21 10l-6.75 4.5" />
            </svg>
          </button>
        )}
      </div>
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m`
  if (diffHr < 24) return `${diffHr}h`
  if (diffDay < 7) return `${diffDay}d`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
