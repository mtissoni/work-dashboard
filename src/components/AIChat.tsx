import { useState, useRef, useEffect } from 'react'
import type { EmailCacheRow, TaskEnrichment, CalendarEvent } from '../types'

// ---- Public types ----

export type ChatContext =
  | { view: 'inbox'; emails: EmailCacheRow[] }
  | { view: 'tasks'; tasks: TaskEnrichment[]; lists: { id: string; name: string }[] }
  | { view: 'calendar'; todayEvents: CalendarEvent[]; upcomingEvents: CalendarEvent[] }
  | { view: 'dashboard'; emails: EmailCacheRow[]; todayEvents: CalendarEvent[]; upcomingEvents: CalendarEvent[] }

export type ChatAction =
  | { type: 'archive_email'; gmailId: string }
  | { type: 'star_email'; gmailId: string }
  | { type: 'mark_read'; gmailId: string }
  | { type: 'complete_task'; taskId: string }
  | { type: 'move_task'; taskId: string; targetListId: string; targetListName: string }
  | { type: 'create_task'; title: string; notes?: string; listId: string; dueDate?: string }

interface AIChatProps {
  apiKey: string | null
  instructions: string | null
  context: ChatContext
  onAction: (action: ChatAction) => Promise<void>
}

// ---- Internal types ----

interface DisplayMessage {
  id: string
  role: 'user' | 'assistant' | 'action'
  content: string
}

type OAIMessage =
  | { role: 'system' | 'user'; content: string }
  | { role: 'assistant'; content: string | null; tool_calls?: OAIToolCall[] }
  | { role: 'tool'; tool_call_id: string; content: string }

interface OAIToolCall {
  id: string
  type: 'function'
  function: { name: string; arguments: string }
}

// ---- Tool definitions ----

const INBOX_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'archive_email',
      description: 'Archive an email, removing it from the inbox',
      parameters: { type: 'object', properties: { gmail_id: { type: 'string', description: 'The gmail_id of the email' } }, required: ['gmail_id'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'star_email',
      description: 'Star an email to flag it as important',
      parameters: { type: 'object', properties: { gmail_id: { type: 'string', description: 'The gmail_id of the email' } }, required: ['gmail_id'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'mark_as_read',
      description: 'Mark an email as read',
      parameters: { type: 'object', properties: { gmail_id: { type: 'string', description: 'The gmail_id of the email' } }, required: ['gmail_id'] },
    },
  },
]

const TASKS_TOOLS = [
  {
    type: 'function',
    function: {
      name: 'create_task',
      description: 'Create a new task in a list',
      parameters: {
        type: 'object',
        properties: {
          title: { type: 'string', description: 'Task title' },
          list_id: { type: 'string', description: 'ID of the list to add the task to' },
          notes: { type: 'string', description: 'Optional notes or description' },
          due_date: { type: 'string', description: 'Optional due date in YYYY-MM-DD format' },
        },
        required: ['title', 'list_id'],
      },
    },
  },
  {
    type: 'function',
    function: {
      name: 'complete_task',
      description: 'Mark a task as complete',
      parameters: { type: 'object', properties: { task_id: { type: 'string', description: 'The id field of the task' } }, required: ['task_id'] },
    },
  },
  {
    type: 'function',
    function: {
      name: 'move_task',
      description: 'Move a task to a different list',
      parameters: {
        type: 'object',
        properties: {
          task_id: { type: 'string', description: 'The id field of the task' },
          target_list_id: { type: 'string', description: 'ID of the target list' },
          target_list_name: { type: 'string', description: 'Name of the target list' },
        },
        required: ['task_id', 'target_list_id', 'target_list_name'],
      },
    },
  },
]

// ---- Helpers ----

const ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

function buildSystemPrompt(context: ChatContext, instructions: string | null): string {
  const today = new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })
  const inst = instructions?.trim()
  const lines: string[] = []

  if (context.view === 'inbox') {
    lines.push('You are an email assistant embedded in a productivity dashboard.')
    if (inst) { lines.push(inst); lines.push('') }
    lines.push('Use tools to archive, star, or mark emails as read. Confirm each action after taking it.')
    lines.push('')
    lines.push('Emails currently in inbox (gmail_id | from | subject | snippet):')
    for (const e of context.emails.slice(0, 30)) {
      lines.push(`${e.gmail_id} | ${e.sender_name ?? e.sender_email} | ${e.subject ?? '(no subject)'} | ${(e.snippet ?? '').slice(0, 80)}`)
    }
  } else if (context.view === 'tasks') {
    lines.push(`You are a task assistant. Today is ${today}.`)
    if (inst) { lines.push(inst); lines.push('') }
    lines.push('Use tools to create, complete, or move tasks. Confirm each action. Always use exact IDs from the lists below.')
    lines.push('')
    lines.push('Tasks (id | title | list | due_date):')
    for (const t of context.tasks.slice(0, 50)) {
      lines.push(`${t.id} | ${t.title ?? 'Untitled'} | ${t.list_name ?? ''} | ${t.due_date ?? '—'}`)
    }
    lines.push('')
    lines.push('Available lists (name: id):')
    for (const l of context.lists) {
      lines.push(`${l.name}: ${l.id}`)
    }
  } else if (context.view === 'dashboard') {
    lines.push(`You are a personal assistant on a productivity dashboard. Today is ${today}.`)
    if (inst) { lines.push(inst); lines.push('') }
    lines.push('Use tools to archive, star, or mark emails as read. For calendar, answer questions only.')
    lines.push('')
    lines.push(`Email triage — ${context.emails.length} emails need attention (gmail_id | from | subject | snippet):`)
    for (const e of context.emails.slice(0, 20)) {
      lines.push(`${e.gmail_id} | ${e.sender_name ?? e.sender_email} | ${e.subject ?? '(no subject)'} | ${(e.snippet ?? '').slice(0, 80)}`)
    }
    if (context.todayEvents.length > 0) {
      lines.push('')
      lines.push("Today's calendar:")
      for (const e of context.todayEvents) {
        const time = e.start.dateTime
          ? new Date(e.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : 'all day'
        lines.push(`- ${e.summary ?? '(no title)'} at ${time}`)
      }
    }
    if (context.upcomingEvents.length > 0) {
      lines.push('')
      lines.push('Upcoming events:')
      for (const e of context.upcomingEvents.slice(0, 10)) {
        const date = e.start.dateTime
          ? new Date(e.start.dateTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          : (e.start.date ?? '')
        lines.push(`- ${e.summary ?? '(no title)'} — ${date}`)
      }
    }
  } else {
    lines.push(`You are a calendar assistant. Today is ${today}.`)
    if (inst) { lines.push(inst); lines.push('') }
    lines.push('Answer questions about the schedule. No actions available.')
    if (context.todayEvents.length > 0) {
      lines.push('')
      lines.push("Today's events:")
      for (const e of context.todayEvents) {
        const time = e.start.dateTime
          ? new Date(e.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : 'all day'
        const attendees = (e.attendees ?? []).filter((a) => !a.self).map((a) => a.displayName ?? a.email).join(', ')
        lines.push(`- ${e.summary ?? '(no title)'} at ${time}${attendees ? ` with ${attendees}` : ''}`)
      }
    }
    if (context.upcomingEvents.length > 0) {
      lines.push('')
      lines.push('Upcoming events:')
      for (const e of context.upcomingEvents) {
        const date = e.start.dateTime
          ? new Date(e.start.dateTime).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
          : (e.start.date ?? '')
        const time = e.start.dateTime
          ? new Date(e.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
          : ''
        lines.push(`- ${e.summary ?? '(no title)'} — ${date}${time ? ` at ${time}` : ''}`)
      }
    }
  }

  return lines.join('\n')
}

function getTools(view: ChatContext['view']) {
  if (view === 'inbox' || view === 'dashboard') return INBOX_TOOLS
  if (view === 'tasks') return TASKS_TOOLS
  return undefined
}

// ---- Component ----

export function AIChat({ apiKey, instructions, context, onAction }: AIChatProps) {
  const [open, setOpen] = useState(false)
  const [display, setDisplay] = useState<DisplayMessage[]>([])
  const [history, setHistory] = useState<OAIMessage[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [display, loading])

  useEffect(() => {
    setDisplay([])
    setHistory([])
  }, [context.view])

  const push = (msg: DisplayMessage) => setDisplay((prev) => [...prev, msg])

  const send = async () => {
    const text = input.trim()
    if (!text || !apiKey || loading) return
    setInput('')
    setLoading(true)

    push({ id: crypto.randomUUID(), role: 'user', content: text })

    const systemMsg: OAIMessage = { role: 'system', content: buildSystemPrompt(context, instructions) }
    const userMsg: OAIMessage = { role: 'user', content: text }
    const tools = getTools(context.view)

    let current: OAIMessage[] = [...history, userMsg]

    try {
      for (let round = 0; round < 3; round++) {
        const res = await fetch(ENDPOINT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
          body: JSON.stringify({
            model: MODEL,
            messages: [systemMsg, ...current],
            ...(tools ? { tools } : {}),
          }),
        })

        if (!res.ok) throw new Error(`OpenAI ${res.status}: ${await res.text()}`)

        const data = await res.json()
        const choice = data.choices?.[0]
        if (!choice) throw new Error('Empty response from OpenAI')

        if (choice.finish_reason === 'tool_calls' && choice.message.tool_calls?.length) {
          const assistantOAI: OAIMessage = {
            role: 'assistant',
            content: null,
            tool_calls: choice.message.tool_calls,
          }
          current = [...current, assistantOAI]

          for (const tc of choice.message.tool_calls as OAIToolCall[]) {
            let args: Record<string, string> = {}
            try { args = JSON.parse(tc.function.arguments) } catch { /* ignore */ }

            let label = ''
            let result = 'done'

            try {
              const fn = tc.function.name
              if (fn === 'archive_email') {
                await onAction({ type: 'archive_email', gmailId: args.gmail_id })
                label = 'Archived email'
              } else if (fn === 'star_email') {
                await onAction({ type: 'star_email', gmailId: args.gmail_id })
                label = 'Starred email'
              } else if (fn === 'mark_as_read') {
                await onAction({ type: 'mark_read', gmailId: args.gmail_id })
                label = 'Marked email as read'
              } else if (fn === 'complete_task') {
                await onAction({ type: 'complete_task', taskId: args.task_id })
                label = 'Completed task'
              } else if (fn === 'move_task') {
                await onAction({ type: 'move_task', taskId: args.task_id, targetListId: args.target_list_id, targetListName: args.target_list_name })
                label = `Moved task to ${args.target_list_name}`
              } else if (fn === 'create_task') {
                await onAction({ type: 'create_task', title: args.title, notes: args.notes, listId: args.list_id, dueDate: args.due_date })
                label = `Created: ${args.title}`
              }
            } catch {
              result = 'error executing action'
            }

            if (label) push({ id: crypto.randomUUID(), role: 'action', content: label })

            current = [...current, { role: 'tool', tool_call_id: tc.id, content: result }]
          }
        } else {
          const content = (choice.message.content ?? '').trim()
          if (content) push({ id: crypto.randomUUID(), role: 'assistant', content })
          setHistory([...current, { role: 'assistant', content: content || null }])
          break
        }
      }
    } catch (err) {
      push({ id: crypto.randomUUID(), role: 'assistant', content: err instanceof Error ? `Error: ${err.message}` : 'Something went wrong.' })
    } finally {
      setLoading(false)
    }
  }

  const placeholder =
    context.view === 'tasks' ? 'Create, complete, or move tasks...' :
    context.view === 'inbox' ? 'Archive, star, or ask about emails...' :
    context.view === 'dashboard' ? 'Triage emails or ask about your calendar...' :
    'Ask about your schedule...'

  return (
    <div className="mt-4 border-t border-gray-100">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 text-xs py-2 cursor-pointer transition-colors text-gray-400 hover:text-gray-600"
      >
        <span className="text-blue-400">✦</span>
        <span>{open ? 'Close AI chat' : 'Ask AI'}</span>
        {!apiKey && <span className="text-orange-400 ml-1">• key needed</span>}
      </button>

      {open && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 overflow-hidden">
          {!apiKey ? (
            <p className="text-sm text-gray-400 text-center py-6 px-4">
              Add your OpenAI key in <span className="font-medium text-gray-600">⚙ AI Settings</span> to use the chat.
            </p>
          ) : (
            <>
              <div ref={scrollRef} className="h-64 overflow-y-auto p-3 space-y-2">
                {display.length === 0 && (
                  <p className="text-xs text-gray-400 text-center pt-8">{placeholder}</p>
                )}
                {display.map((msg) => (
                  <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'action' ? (
                      <span className="text-xs text-green-700 bg-green-50 border border-green-100 px-2.5 py-1 rounded-full">
                        ✓ {msg.content}
                      </span>
                    ) : (
                      <div className={`max-w-[85%] px-3 py-2 rounded-xl text-sm leading-relaxed whitespace-pre-wrap ${
                        msg.role === 'user'
                          ? 'bg-blue-600 text-white rounded-br-sm'
                          : 'bg-white border border-gray-200 text-gray-800 rounded-bl-sm'
                      }`}>
                        {msg.content}
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex justify-start">
                    <div className="bg-white border border-gray-200 rounded-xl rounded-bl-sm px-3 py-2.5">
                      <span className="flex gap-1 items-center">
                        {[0, 150, 300].map((delay) => (
                          <span
                            key={delay}
                            className="w-1.5 h-1.5 bg-gray-400 rounded-full animate-bounce"
                            style={{ animationDelay: `${delay}ms` }}
                          />
                        ))}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 p-3 border-t border-gray-200 bg-white">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send() } }}
                  placeholder={placeholder}
                  disabled={loading}
                  className="flex-1 px-3 py-1.5 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                />
                <button
                  onClick={send}
                  disabled={loading || !input.trim()}
                  className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                >
                  Send
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
