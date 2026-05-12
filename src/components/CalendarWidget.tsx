import type { CalendarEvent, ViewType } from '../types'

interface CalendarWidgetProps {
  todayEvents: CalendarEvent[]
  nextEvent: CalendarEvent | null
  onNavigate: (view: ViewType) => void
}

export function CalendarWidget({ todayEvents, nextEvent, onNavigate }: CalendarWidgetProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">Today's Calendar</h2>
        <button
          onClick={() => onNavigate('calendar')}
          className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          View Week
        </button>
      </div>

      {todayEvents.length === 0 ? (
        <p className="text-sm text-gray-400 py-4 text-center">
          No events today.
        </p>
      ) : (
        <div className="space-y-2">
          {todayEvents.slice(0, 5).map((event) => (
            <EventRow key={event.id} event={event} isNext={event.id === nextEvent?.id} />
          ))}
          {todayEvents.length > 5 && (
            <p className="text-xs text-gray-400 mt-2 text-center">
              +{todayEvents.length - 5} more events
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function EventRow({ event, isNext }: { event: CalendarEvent; isNext: boolean }) {
  const time = formatEventTime(event)
  const isAllDay = !event.start.dateTime
  const meetLink = event.conferenceData?.entryPoints?.find(
    (e) => e.entryPointType === 'video'
  )?.uri

  return (
    <div
      className={`flex items-center gap-2.5 py-1.5 px-2 -mx-2 rounded-lg ${
        isNext ? 'bg-blue-50 border border-blue-100' : ''
      }`}
    >
      <div
        className={`w-1 h-8 rounded-full flex-shrink-0 ${
          isNext ? 'bg-blue-500' : 'bg-gray-200'
        }`}
      />
      <div className="flex-1 min-w-0">
        <p className={`text-sm truncate ${isNext ? 'font-semibold text-gray-900' : 'text-gray-700'}`}>
          {event.summary || '(No title)'}
        </p>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {isAllDay ? 'All day' : time}
          </span>
          {meetLink && (
            <a
              href={meetLink}
              target="_blank"
              rel="noopener noreferrer"
              onClick={(e) => e.stopPropagation()}
              className="text-xs text-blue-500 hover:text-blue-600"
            >
              Join
            </a>
          )}
          {event.location && !meetLink && (
            <span className="text-xs text-gray-400 truncate">{event.location}</span>
          )}
        </div>
      </div>
      {isNext && (
        <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded flex-shrink-0">
          Next
        </span>
      )}
    </div>
  )
}

function formatEventTime(event: CalendarEvent): string {
  if (!event.start.dateTime) return 'All day'

  const start = new Date(event.start.dateTime)
  const end = new Date(event.end.dateTime ?? event.end.date ?? '')

  const fmt = (d: Date) =>
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })

  return `${fmt(start)} – ${fmt(end)}`
}
