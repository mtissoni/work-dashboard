import type { GmailMessage, GmailMessagePart } from '../../types'

export interface ParsedEmail {
  subject: string
  senderName: string
  senderEmail: string
  date: string
  messageId: string
}

export function parseHeaders(message: GmailMessage): ParsedEmail {
  const headers = message.payload.headers
  const get = (name: string) =>
    headers.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ''

  const from = get('From')
  const { name, email } = parseFromHeader(from)

  return {
    subject: get('Subject'),
    senderName: name,
    senderEmail: email,
    date: get('Date'),
    messageId: get('Message-ID'),
  }
}

function parseFromHeader(from: string): { name: string; email: string } {
  const match = from.match(/^"?(.+?)"?\s*<(.+?)>$/)
  if (match) {
    return { name: match[1].trim(), email: match[2].trim() }
  }
  return { name: from, email: from }
}

export function decodeBase64Url(data: string): string {
  const base64 = data.replace(/-/g, '+').replace(/_/g, '/')
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0))
  return new TextDecoder('utf-8').decode(bytes)
}

export function extractEmailBody(message: GmailMessage): string {
  const html = findBodyPart(message.payload, 'text/html')
  if (html) return decodeBase64Url(html)

  const plain = findBodyPart(message.payload, 'text/plain')
  if (plain) return `<pre style="white-space:pre-wrap;font-family:inherit">${decodeBase64Url(plain)}</pre>`

  return '<p>No content available</p>'
}

function findBodyPart(
  part: { mimeType: string; body?: { data?: string }; parts?: GmailMessagePart[] },
  mimeType: string
): string | null {
  if (part.mimeType === mimeType && part.body?.data) {
    return part.body.data
  }

  if (part.parts) {
    for (const child of part.parts) {
      const result = findBodyPart(child, mimeType)
      if (result) return result
    }
  }

  return null
}
