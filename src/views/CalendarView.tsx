import { useState } from 'react'
import type { CalendarEvent } from '../types'
import { generateMeetingPrep, generateMeetingFollowUp } from '../lib/gemini/gemini-api'

interface CalendarViewProps {
  todayEvents: CalendarEvent[]
  upcomingEvents: CalendarEvent[]
  loading: boolean
  aiApiKey: string | null
  aiInstructions: string | null
}

export function CalendarView({ todayEvents, upcomingEvents, loading, aiApiKey, aiInstructions }: CalendarViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Loading calendar...</p>
      </div>
    )
  }

  const grouped = groupByDay(upcomingEvents)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
        <p className="text-sm text-gray-500 mt-1">
          {todayEvents.length} events today, {upcomingEvents.length} this week
        </p>
      </div>

      {grouped.length === 0 ? (
        <p className="text-center py-12 text-gray-400">No events this week.</p>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ date, label, isToday, events }) => (
            <div key={date} className="space-y-1">
              <h2 className={`text-[11px] font-semibold uppercase tracking-wider px-3 py-2 ${isToday ? 'text-blue-600' : 'text-gray-400'}`}>
                {label}
                <span className="text-gray-400 ml-2 normal-case">
                  ({events.length} event{events.length !== 1 ? 's' : ''})
                </span>
              </h2>
              <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden divide-y divide-gray-50">
                {events.map((event) => (
                  <EventCard
                    key={event.id}
                    event={event}
                    aiApiKey={aiApiKey}
                    aiInstructions={aiInstructions}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

type AIPanel = 'none' | 'prep' | 'followup'

function EventCard({
  event,
  aiApiKey,
  aiInstructions,
}: {
  event: CalendarEvent
  aiApiKey: string | null
  aiInstructions: string | null
}) {
  const isAllDay = !event.start.dateTime
  const startTime = event.start.dateTime
    ? new Date(event.start.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null
  const endTime = event.end.dateTime
    ? new Date(event.end.dateTime).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })
    : null
  const isPast = event.end.dateTime ? new Date(event.end.dateTime) < new Date() : false
  const meetLink = event.conferenceData?.entryPoints?.find((e) => e.entryPointType === 'video')?.uri
  const attendeeNames = (event.attendees ?? []).filter((a) => !a.self).map((a) => a.displayName ?? a.email)
  const startLabel = event.start.dateTime
    ? new Date(event.start.dateTime).toLocaleString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit', hour12: true })
    : event.start.date ?? ''

  const [panel, setPanel] = useState<AIPanel>('none')
  const [aiOutput, setAiOutput] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [aiError, setAiError] = useState<string | null>(null)
  const [transcript, setTranscript] = useState('')
  const [copied, setCopied] = useState(false)
  const [prepContext, setPrepContext] = useState('')
  const [briefExpanded, setBriefExpanded] = useState(false)

  const togglePanel = (target: AIPanel) => {
    setPanel((p) => {
      if (p === target) return 'none'
      setAiOutput('')
      setAiError(null)
      setCopied(false)
      setPrepContext('')
      setBriefExpanded(false)
      return target
    })
  }

  const handlePrep = async () => {
    if (!aiApiKey) return
    setAiLoading(true)
    setAiError(null)
    try {
      const result = await generateMeetingPrep(aiApiKey, {
        title: event.summary ?? '(no title)',
        description: (event.description ?? '') + (prepContext.trim() ? `\n\nContext from user: ${prepContext.trim()}` : ''),
        attendees: attendeeNames,
        startTime: startLabel,
        persistentInstructions: aiInstructions ?? '',
      })
      setAiOutput(result)
      setBriefExpanded(false)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI error')
    } finally {
      setAiLoading(false)
    }
  }

  const handleFollowUp = async () => {
    if (!aiApiKey || !transcript.trim()) return
    setAiLoading(true)
    setAiError(null)
    try {
      const result = await generateMeetingFollowUp(aiApiKey, {
        title: event.summary ?? '(no title)',
        attendees: attendeeNames,
        startTime: startLabel,
        transcript,
        persistentInstructions: aiInstructions ?? '',
      })
      setAiOutput(result)
    } catch (err) {
      setAiError(err instanceof Error ? err.message : 'AI error')
    } finally {
      setAiLoading(false)
    }
  }

  const handleCopy = () => {
    navigator.clipboard.writeText(aiOutput)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className={isPast ? 'opacity-60' : ''}>
      {/* Event row */}
      <div className="flex gap-3 px-4 py-3">
        {/* Time */}
        <div className="w-24 flex-shrink-0 text-right">
          {isAllDay ? (
            <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">All day</span>
          ) : (
            <div>
              <div className="text-sm font-medium text-gray-900">{startTime}</div>
              <div className="text-xs text-gray-400">{endTime}</div>
            </div>
          )}
        </div>

        {/* Color bar */}
        <div className={`w-1 rounded-full flex-shrink-0 ${isAllDay ? 'bg-purple-300' : 'bg-blue-400'}`} />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <a href={event.htmlLink} target="_blank" rel="noopener noreferrer"
            className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors">
            {event.summary || '(No title)'}
          </a>

          <div className="flex flex-wrap items-center gap-2 mt-0.5">
            {event.location && (
              <span className="text-xs text-gray-400 truncate max-w-xs">📍 {event.location}</span>
            )}
            {meetLink && (
              <a href={meetLink} target="_blank" rel="noopener noreferrer"
                className="text-xs text-blue-500 hover:text-blue-600 font-medium">
                🔗 Join meeting
              </a>
            )}
            {event.organizer && !event.organizer.self && event.organizer.displayName && (
              <span className="text-xs text-gray-400">by {event.organizer.displayName}</span>
            )}
          </div>

          {event.attendees && event.attendees.length > 1 && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-xs text-gray-400">{event.attendees.length} attendees</span>
              {event.attendees.filter((a) => !a.self).slice(0, 3).map((a) => (
                <span key={a.email}
                  className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] font-medium"
                  title={a.displayName ?? a.email}>
                  {(a.displayName ?? a.email)[0].toUpperCase()}
                </span>
              ))}
              {event.attendees.filter((a) => !a.self).length > 3 && (
                <span className="text-[10px] text-gray-400">
                  +{event.attendees.filter((a) => !a.self).length - 3}
                </span>
              )}
            </div>
          )}

          {/* AI action buttons */}
          {aiApiKey && !isAllDay && (
            <div className="flex gap-2 mt-2">
              {!isPast && (
                <button
                  onClick={() => togglePanel('prep')}
                  className={`text-xs px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    panel === 'prep' ? 'bg-blue-100 text-blue-700' : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                  }`}
                >
                  ✦ Prep meeting
                </button>
              )}
              {isPast && (
                <button
                  onClick={() => togglePanel('followup')}
                  className={`text-xs px-2 py-0.5 rounded-md transition-colors cursor-pointer ${
                    panel === 'followup' ? 'bg-green-100 text-green-700' : 'text-gray-400 hover:text-green-600 hover:bg-green-50'
                  }`}
                >
                  ✦ Follow-up email
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* AI panel — prep */}
      {panel === 'prep' && (
        <div className="mx-4 mb-3 bg-blue-50 border border-blue-100 rounded-lg p-3 space-y-2">
          {/* Context form — always visible until brief is generated */}
          {!aiOutput && (
            <>
              <label className="block text-xs text-gray-500">
                Contame sobre esta reunión para que pueda prepararte mejor
              </label>
              <textarea
                value={prepContext}
                onChange={(e) => setPrepContext(e.target.value)}
                rows={3}
                placeholder="¿Cuál es el objetivo? ¿Hay algo específico que querés preparar? ¿Alguna preocupación o tema sensible?"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y bg-white"
              />
              {aiError && <p className="text-xs text-red-600">{aiError}</p>}
              <button
                onClick={handlePrep}
                disabled={aiLoading}
                className="w-full py-1.5 text-sm bg-blue-600 hover:bg-blue-700 text-white rounded-md cursor-pointer transition-colors disabled:opacity-50"
              >
                {aiLoading ? 'Generando…' : 'Generar prep brief'}
              </button>
            </>
          )}

          {/* Collapsible brief output */}
          {aiOutput && (
            <>
              <button
                onClick={() => setBriefExpanded((v) => !v)}
                className="w-full flex items-center justify-between text-xs font-medium text-blue-700 hover:text-blue-800 cursor-pointer"
              >
                <span>Meeting brief</span>
                <span>{briefExpanded ? '▲ Collapse' : '▼ Expand'}</span>
              </button>
              {briefExpanded && (
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-sans leading-relaxed border-t border-blue-100 pt-2">
                  {aiOutput}
                </pre>
              )}
              <div className="flex gap-3">
                {briefExpanded && (
                  <button onClick={handleCopy} className="text-xs text-blue-600 hover:text-blue-700 cursor-pointer">
                    {copied ? 'Copied ✓' : 'Copy'}
                  </button>
                )}
                <button
                  onClick={() => { setAiOutput(''); setBriefExpanded(false) }}
                  className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer"
                >
                  Edit context
                </button>
                <button onClick={handlePrep} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">
                  Regenerate
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {/* AI panel — follow-up */}
      {panel === 'followup' && (
        <div className="mx-4 mb-3 bg-green-50 border border-green-100 rounded-lg p-3 space-y-2">
          {!aiOutput ? (
            <>
              <label className="block text-xs text-gray-500">Paste transcript or meeting notes</label>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                rows={4}
                placeholder="Paste the meeting transcript, or write a summary of what was discussed…"
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-y bg-white"
              />
              {aiError && <p className="text-xs text-red-600">{aiError}</p>}
              <button
                onClick={handleFollowUp}
                disabled={aiLoading || !transcript.trim()}
                className="w-full py-1.5 text-sm bg-green-600 hover:bg-green-700 text-white rounded-md cursor-pointer transition-colors disabled:opacity-50"
              >
                {aiLoading ? 'Generating…' : 'Generate follow-up email'}
              </button>
            </>
          ) : (
            <>
              <textarea
                value={aiOutput}
                onChange={(e) => setAiOutput(e.target.value)}
                rows={8}
                className="w-full px-2.5 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 resize-y bg-white"
              />
              <div className="flex gap-2">
                <button onClick={handleCopy} className="text-xs text-green-600 hover:text-green-700 cursor-pointer">
                  {copied ? 'Copied ✓' : 'Copy'}
                </button>
                <button onClick={() => { setAiOutput(''); setTranscript('') }} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">
                  Edit notes
                </button>
                <button onClick={handleFollowUp} className="text-xs text-gray-400 hover:text-gray-600 cursor-pointer">
                  Regenerate
                </button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

function groupByDay(events: CalendarEvent[]): { date: string; label: string; isToday: boolean; events: CalendarEvent[] }[] {
  const today = new Date()
  const todayStr = today.toDateString()
  const tomorrow = new Date(today)
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowStr = tomorrow.toDateString()

  const groups = new Map<string, CalendarEvent[]>()
  for (const event of events) {
    const dateStr = event.start.dateTime
      ? new Date(event.start.dateTime).toDateString()
      : new Date(event.start.date ?? '').toDateString()
    const existing = groups.get(dateStr) ?? []
    existing.push(event)
    groups.set(dateStr, existing)
  }

  return Array.from(groups.entries()).map(([dateStr, events]) => {
    const date = new Date(dateStr)
    const isToday = dateStr === todayStr
    let label: string
    if (isToday) label = 'Today'
    else if (dateStr === tomorrowStr) label = 'Tomorrow'
    else label = date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' })
    return { date: dateStr, label, isToday, events }
  })
}
