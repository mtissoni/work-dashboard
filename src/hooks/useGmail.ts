import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  archiveMessage,
  markAsRead,
  starMessage,
  unstarMessage,
} from '../lib/gmail/gmail-api'
import type { EmailCacheRow } from '../types'

export function useGmail(userId: string | null) {
  const [emails, setEmails] = useState<EmailCacheRow[]>([])
  const [loading, setLoading] = useState(true)

  const fetchEmails = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const { data, error } = await supabase
      .from('email_cache')
      .select('*')
      .eq('user_id', userId)
      .order('received_at', { ascending: false })
      .limit(100)

    if (error) {
      console.error('Error fetching emails:', error)
    } else {
      setEmails((data ?? []) as EmailCacheRow[])
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchEmails()
  }, [fetchEmails])

  const actionableEmails = emails.filter((e) => e.is_actionable && !e.triaged_at)
  const actionableCount = actionableEmails.length

  const doArchive = useCallback(
    async (googleToken: string, email: EmailCacheRow) => {
      await archiveMessage(googleToken, email.gmail_id)
      await supabase
        .from('email_cache')
        .update({ triaged_at: new Date().toISOString(), triage_action: 'archived' })
        .eq('id', email.id)
      setEmails((prev) => prev.filter((e) => e.id !== email.id))
    },
    []
  )

  const doMarkRead = useCallback(
    async (googleToken: string, email: EmailCacheRow) => {
      await markAsRead(googleToken, email.gmail_id)
      await supabase
        .from('email_cache')
        .update({ is_unread: false })
        .eq('id', email.id)
      setEmails((prev) =>
        prev.map((e) => (e.id === email.id ? { ...e, is_unread: false } : e))
      )
    },
    []
  )

  const doStar = useCallback(
    async (googleToken: string, email: EmailCacheRow) => {
      if (email.is_starred) {
        await unstarMessage(googleToken, email.gmail_id)
        await supabase
          .from('email_cache')
          .update({ is_starred: false })
          .eq('id', email.id)
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, is_starred: false } : e))
        )
      } else {
        await starMessage(googleToken, email.gmail_id)
        await supabase
          .from('email_cache')
          .update({ is_starred: true })
          .eq('id', email.id)
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, is_starred: true } : e))
        )
      }
    },
    []
  )

  return {
    emails,
    actionableEmails,
    actionableCount,
    loading,
    fetchEmails,
    doArchive,
    doMarkRead,
    doStar,
  }
}
