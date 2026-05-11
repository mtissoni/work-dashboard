import { useState, useCallback } from 'react'
import { syncGoogleTasks } from '../lib/sync/sync'
import type { SyncResult } from '../lib/sync/types'

export function useSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<SyncResult | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  const sync = useCallback(async (googleToken: string, userId: string) => {
    setIsSyncing(true)
    try {
      const result = await syncGoogleTasks(googleToken, userId)
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
