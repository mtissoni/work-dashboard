import { useState } from 'react'
import type { EmailCacheRow } from '../types'
import { EmailRow } from '../components/EmailRow'

interface InboxViewProps {
  emails: EmailCacheRow[]
  onSelectEmail: (email: EmailCacheRow) => void
  onArchive: (email: EmailCacheRow) => void
  onStar: (email: EmailCacheRow) => void
  onMarkRead: (email: EmailCacheRow) => void
}

export function InboxView({
  emails,
  onSelectEmail,
  onArchive,
  onStar,
  onMarkRead,
}: InboxViewProps) {
  const [search, setSearch] = useState('')

  const filtered = search
    ? emails.filter(
        (e) =>
          e.subject?.toLowerCase().includes(search.toLowerCase()) ||
          e.sender_name?.toLowerCase().includes(search.toLowerCase()) ||
          e.sender_email?.toLowerCase().includes(search.toLowerCase()) ||
          e.snippet?.toLowerCase().includes(search.toLowerCase())
      )
    : emails

  const actionable = filtered.filter((e) => e.is_actionable && !e.triaged_at)
  const recent = filtered.filter((e) => !e.is_actionable || e.triaged_at)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Inbox</h1>
        <p className="text-sm text-gray-500 mt-1">
          {emails.length} emails, {actionable.length} need attention
        </p>
      </div>

      <input
        type="text"
        placeholder="Search emails..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {actionable.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider px-3 py-2">
            Needs Attention ({actionable.length})
          </h2>
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {actionable.map((email) => (
              <EmailRow
                key={email.id}
                email={email}
                onSelect={onSelectEmail}
                onArchive={onArchive}
                onStar={onStar}
                onMarkRead={onMarkRead}
              />
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-medium text-gray-500 uppercase tracking-wider px-3 py-2">
          {actionable.length > 0 ? 'Other' : 'All Emails'} ({recent.length})
        </h2>
        {recent.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            {recent.map((email) => (
              <EmailRow
                key={email.id}
                email={email}
                onSelect={onSelectEmail}
                onArchive={onArchive}
                onStar={onStar}
                onMarkRead={onMarkRead}
              />
            ))}
          </div>
        ) : (
          <p className="text-center py-8 text-gray-400">No emails to show.</p>
        )}
      </div>
    </div>
  )
}
