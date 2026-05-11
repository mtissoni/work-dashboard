import { useState, useCallback } from 'react'
import { syncGmailInbox } from '../lib/gmail/gmail-sync'
import type { GmailSyncResult } from '../lib/gmail/gmail-sync'

export function useEmailSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<GmailSyncResult | null>(null)
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null)

  const sync = useCallback(async (googleToken: string, userId: string) => {
    setIsSyncing(true)
    try {
      const result = await syncGmailInbox(googleToken, userId)
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
