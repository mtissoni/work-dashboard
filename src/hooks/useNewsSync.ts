import { useState, useCallback } from 'react'
import { syncNewsFeeds } from '../lib/news/news-sync'
import type { NewsSyncResult } from '../lib/news/news-sync'

export function useNewsSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<NewsSyncResult | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  const sync = useCallback(async (userId: string) => {
    setIsSyncing(true)
    try {
      const result = await syncNewsFeeds(userId)
      setLastResult(result)
      if (result.status === 'success') {
        setLastSyncedAt(new Date())
      }
      return result
    } finally {
      setIsSyncing(false)
    }
  }, [])

  return { sync, isSyncing, lastResult, lastSyncedAt }
}
