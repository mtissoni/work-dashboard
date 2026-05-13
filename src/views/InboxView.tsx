import { useState } from 'react'
import type { EmailCacheRow } from '../types'
import { EmailRow } from '../components/EmailRow'

interface InboxViewProps {
  emails: EmailCacheRow[]
  geminiApiKey: string | null
  geminiInstructions: string | null
  onSelectEmail: (email: EmailCacheRow) => void
  onArchive: (email: EmailCacheRow) => void
  onStar: (email: EmailCacheRow) => void
  onMarkRead: (email: EmailCacheRow) => void
  onSaveGeminiSettings: (apiKey: string, instructions: string) => Promise<boolean>
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
}: InboxViewProps) {
  const [search, setSearch] = useState('')
  const [showSettings, setShowSettings] = useState(false)
  const [apiKeyInput, setApiKeyInput] = useState(geminiApiKey ?? '')
  const [instructionsInput, setInstructionsInput] = useState(geminiInstructions ?? '')
  const [saving, setSaving] = useState(false)
  const [savedMsg, setSavedMsg] = useState(false)

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

  const handleSaveSettings = async () => {
    setSaving(true)
    const ok = await onSaveGeminiSettings(apiKeyInput, instructionsInput)
    setSaving(false)
    if (ok) {
      setSavedMsg(true)
      setTimeout(() => setSavedMsg(false), 2000)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Inbox</h1>
          <p className="text-sm text-gray-500 mt-1">
            {emails.length} emails, {actionable.length} need attention
          </p>
        </div>
        <button
          onClick={() => setShowSettings((v) => !v)}
          title="AI settings"
          className={`mt-1 px-2.5 py-1 text-xs rounded-md transition-colors cursor-pointer ${
            geminiApiKey
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
          }`}
        >
          ⚙ AI {geminiApiKey ? '✓' : 'not configured'}
        </button>
      </div>

      {showSettings && (
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-700">AI Settings (ChatGPT)</h3>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              OpenAI API Key{' '}
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-500 hover:underline"
              >
                (get one at platform.openai.com)
              </a>
            </label>
            <input
              type="password"
              value={apiKeyInput}
              onChange={(e) => setApiKeyInput(e.target.value)}
              placeholder="AIza..."
              className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">
              Default Instructions{' '}
              <span className="text-gray-400">
                (style, tone, language — included in every prompt)
              </span>
            </label>
            <textarea
              value={instructionsInput}
              onChange={(e) => setInstructionsInput(e.target.value)}
              rows={3}
              placeholder="e.g. Write in Spanish. Keep replies concise and professional. Sign off as Marcelo."
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

      <input
        type="text"
        placeholder="Search emails..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
      />

      {actionable.length > 0 && (
        <div>
          <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
            Needs Attention ({actionable.length})
          </h2>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
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
        <h2 className="text-[11px] font-semibold text-gray-400 uppercase tracking-wider px-3 py-2">
          {actionable.length > 0 ? 'Other' : 'All Emails'} ({recent.length})
        </h2>
        {recent.length > 0 ? (
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
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
