import type { CalendarEvent } from '../../types'

const BASE = 'https://www.googleapis.com/calendar/v3'

async function calendarFetch<T>(token: string, path: string, params?: Record<string, string>): Promise<T> {
  const url = new URL(`${BASE}${path}`)
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      url.searchParams.set(k, v)
    }
  }

  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}` },
  })

  if (!res.ok) {
    throw new Error(`Calendar API ${res.status}: ${await res.text()}`)
  }

  return res.json()
}

/**
 * Fetch events from the primary calendar within a time range.
 */
export async function listEvents(
  token: string,
  timeMin: string,
  timeMax: string,
  maxResults = 50
): Promise<CalendarEvent[]> {
  const data = await calendarFetch<{ items?: CalendarEvent[] }>(
    token,
    '/calendars/primary/events',
    {
      timeMin,
      timeMax,
      maxResults: String(maxResults),
      singleEvents: 'true',
      orderBy: 'startTime',
    }
  )
  return (data.items ?? []).filter((e) => e.status !== 'cancelled')
}

/**
 * Fetch today's events (full day in local time).
 */
export async function listTodayEvents(token: string): Promise<CalendarEvent[]> {
  const now = new Date()
  // Build ISO strings anchored to local midnight, not UTC midnight
  const pad = (n: number) => String(n).padStart(2, '0')
  const y = now.getFullYear()
  const m = pad(now.getMonth() + 1)
  const d = pad(now.getDate())
  const startOfDay = `${y}-${m}-${d}T00:00:00`
  const endOfDay   = `${y}-${m}-${d}T23:59:59`

  return listEvents(token, startOfDay, endOfDay)
}

/**
 * Fetch upcoming events for the next N days across all calendars.
 */
export async function listUpcomingEvents(token: string, days = 7): Promise<CalendarEvent[]> {
  // List all writable/readable calendars first, then fetch events from each
  let calendarIds: string[] = []
  try {
    const list = await calendarFetch<{ items?: { id: string; accessRole: string }[] }>(
      token,
      '/users/me/calendarList'
    )
    calendarIds = (list.items ?? [])
      .filter((c) => c.accessRole === 'owner' || c.accessRole === 'writer' || c.accessRole === 'reader')
      .map((c) => c.id)
  } catch {
    calendarIds = ['primary']
  }
  if (calendarIds.length === 0) calendarIds = ['primary']

  const now = new Date()
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)
  const timeMin = now.toISOString()
  const timeMax = end.toISOString()

  const results = await Promise.allSettled(
    calendarIds.map((id) =>
      calendarFetch<{ items?: CalendarEvent[] }>(token, `/calendars/${encodeURIComponent(id)}/events`, {
        timeMin,
        timeMax,
        maxResults: '100',
        singleEvents: 'true',
        orderBy: 'startTime',
      }).then((data) => (data.items ?? []).filter((e) => e.status !== 'cancelled'))
    )
  )

  const all: CalendarEvent[] = []
  for (const r of results) {
    if (r.status === 'fulfilled') all.push(...r.value)
  }

  // Deduplicate by event id, sort by start time
  const seen = new Set<string>()
  return all
    .filter((e) => { if (seen.has(e.id)) return false; seen.add(e.id); return true })
    .sort((a, b) => {
      const aTime = a.start.dateTime ?? a.start.date ?? ''
      const bTime = b.start.dateTime ?? b.start.date ?? ''
      return aTime.localeCompare(bTime)
    })
}
