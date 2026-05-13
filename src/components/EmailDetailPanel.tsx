import { useState, useEffect, useRef } from 'react'
import type { EmailCacheRow } from '../types'
import { getMessage } from '../lib/gmail/gmail-api'
import { extractEmailBody, parseHeaders } from '../lib/gmail/parse-headers'
import { buildEmailReplyPrompt, generateEmailReply, suggestTaskFromEmail } from '../lib/gemini/gemini-api'
import { createDraft } from '../lib/gmail/gmail-drafts'
import { formatDate } from '../utils/date-helpers'

export interface CreateTaskData {
  title: string
  notes: string
  listId: string
  dueDate: string
}

interface EmailDetailPanelProps {
  email: EmailCacheRow
  googleToken: string
  geminiApiKey: string | null
  geminiInstructions: string | null
  listOptions: { id: string; name: string }[]
  onClose: () => void
  onArchive: (email: EmailCacheRow) => void
  onStar: (email: EmailCacheRow) => void
  onMarkRead: (email: EmailCacheRow) => void
  onCreateTask: (email: EmailCacheRow, data: CreateTaskData) => Promise<void>
}

type DraftStep = 'idle' | 'prompt' | 'generating' | 'draft' | 'saving' | 'saved'

export function EmailDetailPanel({
  email,
  googleToken,
  geminiApiKey,
  geminiInstructions,
  listOptions,
  onClose,
  onArchive,
  onStar,
  onMarkRead,
  onCreateTask,
}: EmailDetailPanelProps) {
  const [bodyHtml, setBodyHtml] = useState<string | null>(null)
  const [bodyText, setBodyText] = useState<string>('')
  const [messageId, setMessageId] = useState<string>('')
  const [loadingBody, setLoadingBody] = useState(true)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  // Draft flow state
  const [draftStep, setDraftStep] = useState<DraftStep>('idle')
  const [promptText, setPromptText] = useState('')
  const [draftText, setDraftText] = useState('')
  const [draftError, setDraftError] = useState<string | null>(null)

  // Task creation state
  const [showTaskForm, setShowTaskForm] = useState(false)
  const [taskTitle, setTaskTitle] = useState('')
  const [taskNotes, setTaskNotes] = useState('')
  const [taskListId, setTaskListId] = useState('')
  const [taskDueDate, setTaskDueDate] = useState('')
  const [taskCreating, setTaskCreating] = useState(false)
  const [taskCreated, setTaskCreated] = useState(false)
  const [taskError, setTaskError] = useState<string | null>(null)
  const [taskSuggesting, setTaskSuggesting] = useState(false)

  useEffect(() => {
    let cancelled = false
    setLoadingBody(true)
    setDraftStep('idle')
    setPromptText('')
    setDraftText('')
    setDraftError(null)
    setShowTaskForm(false)
    setTaskTitle(email.subject ?? '')
    setTaskNotes('')
    setTaskListId(listOptions[0]?.id ?? '')
    setTaskDueDate('')
    setTaskCreated(false)
    setTaskError(null)

    getMessage(googleToken, email.gmail_id, 'full')
      .then((fullMessage) => {
        if (!cancelled) {
          const parsed = parseHeaders(fullMessage)
          setMessageId(parsed.messageId)
          const html = extractEmailBody(fullMessage)
          setBodyHtml(html)
          // strip tags for use in Gemini prompt
          const tmp = document.createElement('div')
          tmp.innerHTML = html
          setBodyText(tmp.textContent ?? tmp.innerText ?? '')
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

    return () => { cancelled = true }
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

  const handleOpenTaskForm = () => {
    setTaskTitle(email.subject ?? '')
    setTaskNotes('')
    setTaskListId(listOptions[0]?.id ?? '')
    setTaskDueDate('')
    setTaskCreated(false)
    setTaskError(null)
    setShowTaskForm(true)
  }

  const handleSubmitTask = async () => {
    if (!taskTitle.trim() || !taskListId) return
    setTaskCreating(true)
    setTaskError(null)
    try {
      await onCreateTask(email, { title: taskTitle, notes: taskNotes, listId: taskListId, dueDate: taskDueDate })
      setTaskCreated(true)
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'Failed to create task')
    } finally {
      setTaskCreating(false)
    }
  }

  const handleSuggestTask = async () => {
    if (!geminiApiKey) return
    setTaskSuggesting(true)
    setTaskError(null)
    try {
      const suggestion = await suggestTaskFromEmail(geminiApiKey, {
        senderName: email.sender_name ?? email.sender_email ?? '',
        senderEmail: email.sender_email ?? '',
        subject: email.subject ?? '(no subject)',
        body: bodyText,
        userContext: taskNotes,
        persistentInstructions: geminiInstructions ?? '',
      })
      setTaskTitle(suggestion.title)
      setTaskNotes(suggestion.notes)
    } catch (err) {
      setTaskError(err instanceof Error ? err.message : 'AI suggestion failed')
    } finally {
      setTaskSuggesting(false)
    }
  }

  const handleOpenDraftFlow = () => {
    const assembled = buildEmailReplyPrompt({
      senderName: email.sender_name ?? email.sender_email ?? '',
      senderEmail: email.sender_email ?? '',
      subject: email.subject ?? '(no subject)',
      body: bodyText,
      persistentInstructions: geminiInstructions ?? '',
    })
    setPromptText(assembled)
    setDraftText('')
    setDraftError(null)
    setDraftStep('prompt')
  }

  const handleGenerate = async () => {
    if (!geminiApiKey) return
    setDraftError(null)
    setDraftStep('generating')
    try {
      const result = await generateEmailReply(geminiApiKey, promptText)
      setDraftText(result)
      setDraftStep('draft')
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Generation failed')
      setDraftStep('prompt')
    }
  }

  const handleSaveToDrafts = async () => {
    setDraftStep('saving')
    try {
      await createDraft(googleToken, {
        to: email.sender_email ?? '',
        subject: email.subject ?? '(no subject)',
        body: draftText,
        threadId: email.thread_id,
        messageId,
      })
      setDraftStep('saved')
    } catch (err) {
      setDraftError(err instanceof Error ? err.message : 'Failed to save draft')
      setDraftStep('draft')
    }
  }

  const showDraftPanel = draftStep !== 'idle'

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
          <div className="text-xs text-gray-400">{formatDate(email.received_at)}</div>
        </div>

        {/* Actions */}
        <div className="flex gap-2 px-4 py-2 border-b border-gray-100 flex-shrink-0 flex-wrap">
          <ActionButton onClick={() => onArchive(email)} label="Archive" />
          <ActionButton
            onClick={() => onStar(email)}
            label={email.is_starred ? 'Unstar' : 'Star'}
          />
          {email.is_unread && (
            <ActionButton onClick={() => onMarkRead(email)} label="Mark Read" />
          )}
          {!showTaskForm && (
            <ActionButton
              onClick={handleOpenTaskForm}
              label={taskCreated ? 'Task created ✓' : 'Create Task'}
              disabled={taskCreated}
            />
          )}
          {!showDraftPanel && (
            <ActionButton
              onClick={handleOpenDraftFlow}
              label={geminiApiKey ? 'Draft Reply' : 'Draft Reply (needs OpenAI key)'}
              disabled={!geminiApiKey || loadingBody}
            />
          )}
        </div>

        {/* Task creation form */}
        {showTaskForm && (
          <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Create Task</span>
              <button onClick={() => setShowTaskForm(false)} className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer">×</button>
            </div>

            <div>
              <label className="block text-xs text-gray-500 mb-1">Title</label>
              <input
                type="text"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Task title"
              />
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs text-gray-500">Context / Notes</label>
                {geminiApiKey && (
                  <button
                    onClick={handleSuggestTask}
                    disabled={taskSuggesting || taskCreated}
                    className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer disabled:opacity-50"
                  >
                    {taskSuggesting ? 'Thinking…' : '✦ Suggest with AI'}
                  </button>
                )}
              </div>
              <textarea
                value={taskNotes}
                onChange={(e) => setTaskNotes(e.target.value)}
                rows={3}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                placeholder={geminiApiKey ? 'Add context or let AI suggest…' : 'What needs to be done?'}
              />
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">List</label>
                <select
                  value={taskListId}
                  onChange={(e) => setTaskListId(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                >
                  {listOptions.map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-1">Due date</label>
                <input
                  type="date"
                  value={taskDueDate}
                  onChange={(e) => setTaskDueDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {taskError && <p className="text-xs text-red-600">{taskError}</p>}

            <button
              onClick={handleSubmitTask}
              disabled={taskCreating || taskCreated || !taskTitle.trim() || !taskListId}
              className="w-full py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer disabled:opacity-50"
            >
              {taskCreating ? 'Creating…' : taskCreated ? 'Task created ✓' : 'Create Task'}
            </button>
          </div>
        )}

        {/* Draft flow panel */}
        {showDraftPanel && (
          <div className="flex-shrink-0 border-b border-gray-200 bg-gray-50 p-4 space-y-3">
            {draftStep === 'prompt' && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Edit Prompt</span>
                  <button
                    onClick={() => setDraftStep('idle')}
                    className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
                  >
                    ×
                  </button>
                </div>
                <textarea
                  value={promptText}
                  onChange={(e) => setPromptText(e.target.value)}
                  rows={8}
                  className="w-full text-xs font-mono border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
                />
                {draftError && (
                  <p className="text-xs text-red-600">{draftError}</p>
                )}
                <button
                  onClick={handleGenerate}
                  disabled={!promptText.trim()}
                  className="w-full py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md transition-colors cursor-pointer disabled:opacity-50"
                >
                  Generate →
                </button>
              </>
            )}

            {draftStep === 'generating' && (
              <div className="flex items-center gap-2 text-sm text-gray-500 py-2">
                <span className="animate-spin">⏳</span>
                Generating draft with Gemini…
              </div>
            )}

            {(draftStep === 'draft' || draftStep === 'saving' || draftStep === 'saved') && (
              <>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-gray-700">Draft Reply</span>
                  <button
                    onClick={() => setDraftStep('idle')}
                    className="text-gray-400 hover:text-gray-600 text-sm cursor-pointer"
                  >
                    ×
                  </button>
                </div>
                <textarea
                  value={draftText}
                  onChange={(e) => setDraftText(e.target.value)}
                  rows={8}
                  disabled={draftStep === 'saving' || draftStep === 'saved'}
                  className="w-full text-sm border border-gray-300 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y disabled:bg-gray-100"
                />
                {draftError && (
                  <p className="text-xs text-red-600">{draftError}</p>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={() => setDraftStep('prompt')}
                    disabled={draftStep === 'saving' || draftStep === 'saved'}
                    className="px-3 py-1.5 text-sm border border-gray-300 hover:bg-gray-100 text-gray-600 rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    Edit Prompt
                  </button>
                  <button
                    onClick={handleSaveToDrafts}
                    disabled={draftStep === 'saving' || draftStep === 'saved' || !draftText.trim()}
                    className="flex-1 py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {draftStep === 'saving'
                      ? 'Saving…'
                      : draftStep === 'saved'
                      ? 'Saved to Gmail Drafts ✓'
                      : 'Save to Gmail Drafts'}
                  </button>
                </div>
              </>
            )}
          </div>
        )}

        {/* Email body */}
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

function ActionButton({
  onClick,
  label,
  disabled = false,
}: {
  onClick: () => void
  label: string
  disabled?: boolean
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-2.5 py-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-600 rounded-md transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-default"
    >
      {label}
    </button>
  )
}
