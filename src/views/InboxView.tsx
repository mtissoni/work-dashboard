import { useState, useMemo } from 'react'
import type { EmailCacheRow } from '../types'
import { EmailRow } from '../components/EmailRow'
import { AIChat, type ChatAction } from '../components/AIChat'

const PAGE_SIZE = 25

type Filter = 'all' | 'starred' | 'unread'

interface InboxViewProps {
  emails: EmailCacheRow[]
  geminiApiKey: string | null
  geminiInstructions: string | null
  onSelectEmail: (email: EmailCacheRow) => void
  onArchive: (email: EmailCacheRow) => void
  onStar: (email: EmailCacheRow) => void
  onMarkRead: (email: EmailCacheRow) => void
  onSaveGeminiSettings: (apiKey: string, instructions: string) => Promise<boolean>
  onSync: () => void
  isSyncing: boolean
}

export function InboxView({
  emails,
  geminiApiKey,
  geminiInstructions,
  onSelectEmail,
  onArchive,
  onStar,
  onMarkRead,
  onSaveGeminiSettings,
  onSync,
  isSyncing,
}: InboxViewProps) {
  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<Filter>('all')
  const [page, setPage] = useState(1)
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey ?? '')
  const [instructionsInput, setInstructionsInput] = useState(geminiInstructions ?? '')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

  const handleSaveSettings = async () => {
    setSaving(true)
    const ok = await onSaveGeminiSettings(apiKeyInput, instructionsInput)
    setSaving(false)
    if (ok) {
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2000)
    }
  }

  const handleAIAction = async (action: ChatAction) => {
    if (action.type === 'archive_email' || action.type === 'star_email' || action.type === 'mark_read') {
      const email = emails.find((e) => e.gmail_id === action.gmailId)
      if (!email) return
      if (action.type === 'archive_email') await onArchive(email)
      else if (action.type === 'star_email') await onStar(email)
      else await onMarkRead(email)
    }
  }

  // Sort chronologically descending, then apply filter + search
  const filtered = useMemo(() => {
    const sorted = [...emails].sort(
      (a, b) => new Date(b.received_at).getTime() - new Date(a.received_at).getTime()
    )
    return sorted.filter((e) => {
      if (filter === 'starred' && !e.is_starred) return false
      if (filter === 'unread' && !e.is_unread) return false
      if (search) {
        const q = search.toLowerCase()
        return (
          e.subject?.toLowerCase().includes(q) ||
          e.sender_name?.toLowerCase().includes(q) ||
          e.sender_email?.toLowerCase().includes(q) ||
          e.snippet?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [emails, filter, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, totalPages)
  const paginated = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE)

  const resetPage = () => setPage(1)

  const starredCount = emails.filter((e) => e.is_starred).length
  const unreadCount = emails.filter((e) => e.is_unread).length

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
          <p className="text-sm text-gray-500 mt-1">{emails.length} emails</p>
        </div>
        <div className="flex items-center gap-2 mt-1">
          <button
            onClick={onSync}
            disabled={isSyncing}
            className="px-2.5 py-1 text-xs rounded-md bg-gray-100 text-gray-600 hover:bg-gray-200 disabled:opacity-40 transition-colors cursor-pointer"
          >
            {isSyncing ? 'Syncing…' : '↻ Sync'}
          </button>
          <button
            onClick={() => setShowSettings((v) => !v)}
            title="AI settings"
            className={`px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
              geminiApiKey
                ? 'bg-green-100 text-green-700 hover:bg-green-200'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            ⚙ AI {geminiApiKey ? '✓' : 'not configured'}
          </button>
        </div>
      </div>

      {/* AI Settings panel */}
      {showSettings && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-700">AI Settings (ChatGPT)</h3>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              OpenAI API Key{' '}
              <a href="https://platform.openai.com/api-keys" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                (get one at platform.openai.com)
              </a>
            </label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="sk-..."
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Default Instructions <span className="text-gray-400">(style, tone, language)</span>
            </label>
            <textarea
              value={instructionsInput}
              onChange={(e) => setInstructionsInput(e.target.value)}
              rows={3}
              placeholder="e.g. Write in Spanish. Keep replies concise. Sign off as Marcelo."
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="px-4 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer disabled:opacity-50"
          >
            {saving ? 'Saving…' : savedMsg ? 'Saved ✓' : 'Save'}
          </button>
        </div>
      )}

      {/* AI Chat */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-1">
        <AIChat
          apiKey={geminiApiKey}
          instructions={geminiInstructions}
          context={{ view: 'inbox', emails }}
          onAction={handleAIAction}
        />
      </div>

      {/* Filters + Search */}
      <div className="flex flex-wrap items-center gap-2">
        {(['all', 'starred', 'unread'] as Filter[]).map((f) => {
          const label =
            f === 'all' ? `All (${emails.length})` :
            f === 'starred' ? `Starred (${starredCount})` :
            `Unread (${unreadCount})`
          return (
            <button
              key={f}
              onClick={() => { setFilter(f); resetPage() }}
              className={`px-3 py-1 text-xs rounded-full border transition-colors cursor-pointer ${
                filter === f
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}
            >
              {label}
            </button>
          )
        })}
        <input
          type="text"
          placeholder="Search..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); resetPage() }}
          className="ml-auto px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-52"
        />
      </div>

      {/* Email list */}
      {paginated.length > 0 ? (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          {paginated.map((email) => (
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
        <p className="text-center py-10 text-gray-400 text-sm">No emails match this filter.</p>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <p className="text-xs text-gray-400">
            {(safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} of {filtered.length}
          </p>
          <div className="flex items-center gap-1">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={safePage === 1}
              className="px-3 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              ← Prev
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - safePage) <= 1)
              .reduce<(number | '…')[]>((acc, p, i, arr) => {
                if (i > 0 && p - (arr[i - 1] as number) > 1) acc.push('…')
                acc.push(p)
                return acc
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="px-1 text-xs text-gray-400">…</span>
                ) : (
                  <button
                    key={p}
                    onClick={() => setPage(p as number)}
                    className={`w-7 h-7 text-xs rounded-lg transition-colors cursor-pointer ${
                      safePage === p
                        ? 'bg-blue-600 text-white'
                        : 'border border-gray-200 hover:bg-gray-50 text-gray-600'
                    }`}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={safePage === totalPages}
              className="px-3 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 cursor-pointer transition-colors"
            >
              Next →
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
