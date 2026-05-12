import type { CalendarEvent } from '../types'

interface CalendarViewProps {
  todayEvents: CalendarEvent[]
  upcomingEvents: CalendarEvent[]
  loading: boolean
}

export function CalendarView({ todayEvents, upcomingEvents, loading }: CalendarViewProps) {
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Loading calendar...</p>
      </div>
    )
  }

  // Group upcoming events by day
  const grouped = groupByDay(upcomingEvents)

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Calendar</h1>
        <p className="text-sm text-gray-500 mt-1">
          {todayEvents.length} events today, {upcomingEvents.length} this week
        </p>
      </div>

      {grouped.length === 0 ? (
        <p className="text-center py-12 text-gray-400">
          No events this week.
        </p>
      ) : (
        <div className="space-y-4">
          {grouped.map(({ date, label, isToday, events }) => (
            <div key={date} className="space-y-1">
              <h2
                className={`text-sm font-medium uppercase tracking-wider px-3 py-2 ${
                  isToday ? 'text-blue-600' : 'text-gray-500'
                }`}
              >
                {label}
                <span className="text-gray-400 ml-2 normal-case">
                  ({events.length} event{events.length !== 1 ? 's' : ''})
                </span>
              </h2>
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden divide-y divide-gray-100">
                {events.map((event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function EventCard({ event }: { event: CalendarEvent }) {
  const isAllDay = !event.start.dateTime
  const startTime = event.start.dateTime
    ? new Date(event.start.dateTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : null
  const endTime = event.end.dateTime
    ? new Date(event.end.dateTime).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    : null

  const meetLink = event.conferenceData?.entryPoints?.find(
    (e) => e.entryPointType === 'video'
  )?.uri

  const isPast = event.end.dateTime
    ? new Date(event.end.dateTime) < new Date()
    : false

  return (
    <div
      className={`flex gap-3 px-4 py-3 ${isPast ? 'opacity-50' : ''}`}
    >
      {/* Time column */}
      <div className="w-24 flex-shrink-0 text-right">
        {isAllDay ? (
          <span className="text-xs font-medium text-purple-600 bg-purple-50 px-2 py-0.5 rounded">
            All day
          </span>
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
        <a
          href={event.htmlLink}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-gray-900 hover:text-blue-600 transition-colors"
        >
          {event.summary || '(No title)'}
        </a>

        <div className="flex flex-wrap items-center gap-2 mt-0.5">
          {event.location && (
            <span className="text-xs text-gray-400 truncate max-w-xs">
              📍 {event.location}
            </span>
          )}
          {meetLink && (
            <a
              href={meetLink}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-blue-500 hover:text-blue-600 font-medium"
            >
              🔗 Join meeting
            </a>
          )}
          {event.organizer && !event.organizer.self && event.organizer.displayName && (
            <span className="text-xs text-gray-400">
              by {event.organizer.displayName}
            </span>
          )}
        </div>

        {event.attendees && event.attendees.length > 1 && (
          <div className="flex items-center gap-1 mt-1">
            <span className="text-xs text-gray-400">
              {event.attendees.length} attendees
            </span>
            {event.attendees
              .filter((a) => !a.self)
              .slice(0, 3)
              .map((a) => (
                <span
                  key={a.email}
                  className="w-5 h-5 rounded-full bg-gray-200 text-gray-500 flex items-center justify-center text-[10px] font-medium"
                  title={a.displayName ?? a.email}
                >
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
      </div>
    </div>
  )
}

function groupByDay(events: CalendarEvent[]): {
  date: string
  label: string
  isToday: boolean
  events: CalendarEvent[]
}[] {
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
    let label: string
    const isToday = dateStr === todayStr

    if (isToday) {
      label = 'Today'
    } else if (dateStr === tomorrowStr) {
      label = 'Tomorrow'
    } else {
      label = date.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'short',
        day: 'numeric',
      })
    }

    return { date: dateStr, label, isToday, events }
  })
}
