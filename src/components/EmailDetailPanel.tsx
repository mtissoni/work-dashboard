import { useState, useEffect, useRef } from 'react'
import type { EmailCacheRow } from '../types'
import { getMessage } from '../lib/gmail/gmail-api'
import { extractEmailBody } from '../lib/gmail/parse-headers'
import { formatDate } from '../utils/date-helpers'

interface EmailDetailPanelProps {
  email: EmailCacheRow
  googleToken: string
  onClose: () => void
  onArchive: (email: EmailCacheRow) => void
  onStar: (email: EmailCacheRow) => void
  onMarkRead: (email: EmailCacheRow) => void
  onCreateTask: (email: EmailCacheRow) => void
}

export function EmailDetailPanel({
  email,
  googleToken,
  onClose,
  onArchive,
  onStar,
  onMarkRead,
  onCreateTask,
}: EmailDetailPanelProps) {
  const [bodyHtml, setBodyHtml] = useState<string | null>(null)
  const [loadingBody, setLoadingBody] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  useEffect(() => {
    let cancelled = false
    setLoadingBody(true)

    getMessage(googleToken, email.gmail_id, 'full')
      .then((fullMessage) => {
        if (!cancelled) {
          setBodyHtml(extractEmailBody(fullMessage))
          setLoadingBody(false)
        }
      })
      .catch((err) => {
        if (!cancelled) {
          console.error('Failed to load email body:', err)
          setBodyHtml('<p>Failed to load email content.</p>')
          setLoadingBody(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [email.gmail_id, googleToken])

  useEffect(() => {
    if (bodyHtml && iframeRef.current) {
      const doc = iframeRef.current.contentDocument
      if (doc) {
        doc.open()
        doc.write(`
          <!DOCTYPE html>
          <html>
          <head><style>
            body { font-family: system-ui, sans-serif; font-size: 14px; color: #333; margin: 12px; line-height: 1.5; }
            img { max-width: 100%; height: auto; }
            a { color: #2563eb; }
          </style></head>
          <body>${bodyHtml}</body>
          </html>
        `)
        doc.close()
      }
    }
  }, [bodyHtml])

  const handlePrepReply = () => {
    const prompt = `I received this email and need to reply. Help me draft a response.

From: ${email.sender_name ?? email.sender_email}
Subject: ${email.subject}
Preview: ${email.snippet}

Please draft a professional, concise reply.`

    navigator.clipboard.writeText(prompt)
    alert('Reply prompt copied to clipboard — paste into Claude or ChatGPT')
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-black/20" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-white shadow-xl flex flex-col h-full">
        {/* Header */}
        <div className="p-4 border-b border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-semibold text-gray-900 pr-4">
              {email.subject ?? '(no subject)'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-xl cursor-pointer"
            >
              ×
            </button>
          </div>
          <div className="mt-1 text-sm text-gray-500">
            From: {email.sender_name ?? email.sender_email}
          </div>
          <div className="text-xs text-gray-400">
            {formatDate(email.received_at)}
          </div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 py-2 border-b border-gray-100 flex-shrink-0">
          <ActionButton onClick={() => onArchive(email)} label="Archive" />
          <ActionButton
            onClick={() => onStar(email)}
            label={email.is_starred ? 'Unstar' : 'Star'}
          />
          {email.is_unread && (
            <ActionButton onClick={() => onMarkRead(email)} label="Mark Read" />
          )}
          <ActionButton onClick={() => onCreateTask(email)} label="Create Task" />
          <ActionButton onClick={handlePrepReply} label="Prep Reply (AI)" />
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden">
          {loadingBody ? (
            <div className="flex items-center justify-center h-full text-gray-400">
              Loading email...
            </div>
          ) : (
            <iframe
              ref={iframeRef}
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
              title="Email content"
            />
          )}
        </div>
      </div>
    </div>
  )
}

function ActionButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors cursor-pointer"
    >
      {label}
    </button>
  )
}
