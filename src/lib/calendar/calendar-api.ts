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
 * Fetch today's events.
 */
export async function listTodayEvents(token: string): Promise<CalendarEvent[]> {
  const now = new Date()
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1)

  return listEvents(token, startOfDay.toISOString(), endOfDay.toISOString())
}

/**
 * Fetch upcoming events for the next N days.
 */
export async function listUpcomingEvents(token: string, days = 7): Promise<CalendarEvent[]> {
  const now = new Date()
  const end = new Date(now.getTime() + days * 24 * 60 * 60 * 1000)

  return listEvents(token, now.toISOString(), end.toISOString(), 100)
}
