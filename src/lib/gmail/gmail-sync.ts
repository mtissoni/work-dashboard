import { supabase } from '../supabase'
import { listInboxMessages, getMessage } from './gmail-api'
import { parseHeaders } from './parse-headers'
import { isActionable } from './actionable-rules'

export interface GmailSyncResult {
  emailCount: number
  status: 'success' | 'error'
  error?: string
}

export async function syncGmailInbox(
  googleToken: string,
  userId: string
): Promise<GmailSyncResult> {
  try {
    const messageRefs = await listInboxMessages(googleToken, 50)
    let count = 0

    for (const ref of messageRefs) {
      const message = await getMessage(googleToken, ref.id, 'metadata')
      const parsed = parseHeaders(message)

      const isUnread = message.labelIds.includes('UNREAD')
      const isStarred = message.labelIds.includes('STARRED')
      const receivedAt = new Date(Number(message.internalDate)).toISOString()

      const emailData = {
        user_id: userId,
        gmail_id: message.id,
        thread_id: message.threadId,
        subject: parsed.subject,
        sender_name: parsed.senderName,
        sender_email: parsed.senderEmail,
        snippet: message.snippet,
        received_at: receivedAt,
        label_ids: message.labelIds,
        is_unread: isUnread,
        is_starred: isStarred,
      }

      const { actionable, reason } = isActionable({
        sender_email: parsed.senderEmail,
        is_unread: isUnread,
        is_starred: isStarred,
        subject: parsed.subject,
        snippet: message.snippet,
        received_at: receivedAt,
      })

      const { error } = await supabase.from('email_cache').upsert(
        {
          ...emailData,
          is_actionable: actionable,
          action_reason: reason,
        },
        {
          onConflict: 'user_id,gmail_id',
          ignoreDuplicates: false,
        }
      )

      if (error) {
        console.error('Email upsert error:', ref.id, error)
      } else {
        count++
      }
    }

    await supabase.from('sync_log').insert({
      user_id: userId,
      source: 'gmail',
      task_count: count,
      status: 'success',
    })

    return { emailCount: count, status: 'success' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown gmail sync error'
    console.error('Gmail sync failed:', message)
    return { emailCount: 0, status: 'error', error: message }
  }
}
