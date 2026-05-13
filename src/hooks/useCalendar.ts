import { useState, useEffect, useCallback, useMemo } from 'react'
import { listTodayEvents, listUpcomingEvents } from '../lib/calendar/calendar-api'
import type { CalendarEvent } from '../types'

export function useCalendar(googleToken: string | null, refreshGoogleToken: () => Promise<string>) {
  const [todayEvents, setTodayEvents] = useState<CalendarEvent[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<CalendarEvent[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchEvents = useCallback(async () => {
    if (!googleToken) return
    setLoading(true)
    setError(null)

    try {
      const [today, upcoming] = await Promise.all([
        listTodayEvents(googleToken),
        listUpcomingEvents(googleToken, 7),
      ])
      setTodayEvents(today)
      setUpcomingEvents(upcoming)
    } catch (err: any) {
      if (err?.message?.includes('401')) {
        try {
          const newToken = await refreshGoogleToken()
          const [today, upcoming] = await Promise.all([
            listTodayEvents(newToken),
            listUpcomingEvents(newToken, 7),
          ])
          setTodayEvents(today)
          setUpcomingEvents(upcoming)
        } catch (retryErr: any) {
          setError(retryErr?.message ?? 'Failed to load calendar')
        }
      } else {
        setError(err?.message ?? 'Failed to load calendar')
      }
    } finally {
      setLoading(false)
    }
  }, [googleToken, refreshGoogleToken])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const nextEvent = useMemo(() => {
    const now = new Date()
    return todayEvents.find((e) => {
      const start = new Date(e.start.dateTime ?? e.start.date ?? '')
      return start > now
    }) ?? null
  }, [todayEvents])

  return {
    todayEvents,
    upcomingEvents,
    nextEvent,
    loading,
    error,
    fetchEvents,
  }
}
