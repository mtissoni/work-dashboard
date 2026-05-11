const AUTOMATED_SENDERS = [
  'noreply@',
  'no-reply@',
  'notifications@',
  'mailer-daemon@',
  'postmaster@',
  'donotreply@',
  'do-not-reply@',
  'alert@',
  'alerts@',
  'news@',
  'newsletter@',
  'marketing@',
  'promo@',
  'promotions@',
  'updates@',
  'info@',
  'support@',
  'feedback@',
]

export function isActionable(email: {
  sender_email: string | null
  is_unread: boolean
  is_starred: boolean
  subject: string | null
  snippet: string | null
  received_at: string
}): { actionable: boolean; reason: string | null } {
  if (email.is_starred) {
    return { actionable: true, reason: 'starred' }
  }

  const senderLower = (email.sender_email ?? '').toLowerCase()
  const isAutomated = AUTOMATED_SENDERS.some((prefix) => senderLower.includes(prefix))

  if (email.is_unread && !isAutomated) {
    const receivedDate = new Date(email.received_at)
    const now = new Date()
    const daysOld = (now.getTime() - receivedDate.getTime()) / (1000 * 60 * 60 * 24)

    if (daysOld >= 2) {
      return { actionable: true, reason: 'stale_unread' }
    }

    const text = `${email.subject ?? ''} ${email.snippet ?? ''}`
    if (text.includes('?')) {
      return { actionable: true, reason: 'has_question' }
    }

    return { actionable: true, reason: 'unread_personal' }
  }

  return { actionable: false, reason: null }
}
