import { useState, useCallback } from 'react'
import { syncClickUpTasks } from '../lib/clickup/clickup-sync'
import type { ClickUpSyncResult } from '../lib/clickup/clickup-sync'

export function useClickUpSync() {
  const [isSyncing, setIsSyncing] = useState(false)
  const [lastResult, setLastResult] = useState<ClickUpSyncResult | null>(null)

  const sync = useCallback(async (clickupToken: string, userId: string, listId: string) => {
    setIsSyncing(true)
    try {
      const result = await syncClickUpTasks(clickupToken, userId, listId)
      setLastResult(result)
      return result
    } finally {
      setIsSyncing(false)
    }
  }, [])

  return { sync, isSyncing, lastResult }
}
