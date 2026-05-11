import type { GmailMessage } from '../../types'

const BASE_URL = 'https://gmail.googleapis.com/gmail/v1'

async function apiFetch<T>(path: string, accessToken: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
      ...options?.headers,
    },
  })

  if (!res.ok) {
    const body = await res.text()
    throw new Error(`Gmail API error ${res.status}: ${body}`)
  }

  return res.json()
}

export async function listInboxMessages(
  accessToken: string,
  maxResults = 50,
  query = 'is:inbox'
): Promise<{ id: string; threadId: string }[]> {
  const params = new URLSearchParams({
    q: query,
    maxResults: String(maxResults),
  })

  const data = await apiFetch<{
    messages?: { id: string; threadId: string }[]
    nextPageToken?: string
  }>(`/users/me/messages?${params}`, accessToken)

  return data.messages ?? []
}

export async function getMessage(
  accessToken: string,
  messageId: string,
  format: 'metadata' | 'full' = 'metadata'
): Promise<GmailMessage> {
  const params = new URLSearchParams({ format })

  if (format === 'metadata') {
    params.append('metadataHeaders', 'From')
    params.append('metadataHeaders', 'To')
    params.append('metadataHeaders', 'Subject')
    params.append('metadataHeaders', 'Date')
  }

  return apiFetch<GmailMessage>(
    `/users/me/messages/${messageId}?${params}`,
    accessToken
  )
}

export async function modifyMessage(
  accessToken: string,
  messageId: string,
  addLabelIds: string[] = [],
  removeLabelIds: string[] = []
): Promise<void> {
  await apiFetch(`/users/me/messages/${messageId}/modify`, accessToken, {
    method: 'POST',
    body: JSON.stringify({ addLabelIds, removeLabelIds }),
  })
}

export async function archiveMessage(accessToken: string, messageId: string): Promise<void> {
  await modifyMessage(accessToken, messageId, [], ['INBOX'])
}

export async function markAsRead(accessToken: string, messageId: string): Promise<void> {
  await modifyMessage(accessToken, messageId, [], ['UNREAD'])
}

export async function starMessage(accessToken: string, messageId: string): Promise<void> {
  await modifyMessage(accessToken, messageId, ['STARRED'], [])
}

export async function unstarMessage(accessToken: string, messageId: string): Promise<void> {
  await modifyMessage(accessToken, messageId, [], ['STARRED'])
}
