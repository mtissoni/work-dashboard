const OPENAI_ENDPOINT = 'https://api.openai.com/v1/chat/completions'
const MODEL = 'gpt-4o-mini'

export async function generateEmailReply(
  apiKey: string,
  prompt: string
): Promise<string> {
  const res = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text: string = data?.choices?.[0]?.message?.content ?? ''
  if (!text) throw new Error('OpenAI returned an empty response')
  return text.trim()
}

export interface TaskSuggestion {
  title: string
  notes: string
}

export async function suggestTaskFromEmail(
  apiKey: string,
  context: {
    senderName: string
    senderEmail: string
    subject: string
    body: string
    userContext: string
    persistentInstructions: string
  }
): Promise<TaskSuggestion> {
  const { senderName, senderEmail, subject, body, userContext, persistentInstructions } = context

  const lines: string[] = []
  if (persistentInstructions.trim()) {
    lines.push(persistentInstructions.trim())
    lines.push('')
  }
  lines.push('Based on the following email, suggest a task to create.')
  if (userContext.trim()) {
    lines.push(`Additional context from the user: ${userContext.trim()}`)
  }
  lines.push('')
  lines.push(`From: ${senderName} <${senderEmail}>`)
  lines.push(`Subject: ${subject}`)
  lines.push('')
  lines.push('--- Email ---')
  lines.push(body)
  lines.push('--- End email ---')
  lines.push('')
  lines.push('Respond with exactly two lines:')
  lines.push('Title: <short actionable task title, max 80 chars>')
  lines.push('Notes: <brief context about what needs to be done, 1-2 sentences>')

  const prompt = lines.join('\n')

  const res = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: MODEL,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`OpenAI API error ${res.status}: ${err}`)
  }

  const data = await res.json()
  const text: string = data?.choices?.[0]?.message?.content ?? ''

  const titleMatch = text.match(/^Title:\s*(.+)$/m)
  const notesMatch = text.match(/^Notes:\s*(.+)$/ms)

  return {
    title: titleMatch?.[1]?.trim() ?? subject,
    notes: notesMatch?.[1]?.trim() ?? '',
  }
}

export async function generateMeetingPrep(
  apiKey: string,
  context: {
    title: string
    description: string
    attendees: string[]
    startTime: string
    persistentInstructions: string
  }
): Promise<string> {
  const { title, description, attendees, startTime, persistentInstructions } = context
  const lines: string[] = []
  if (persistentInstructions.trim()) { lines.push(persistentInstructions.trim()); lines.push('') }
  lines.push(`Prepare me for this upcoming meeting.`)
  lines.push(`Title: ${title}`)
  lines.push(`Time: ${startTime}`)
  if (attendees.length) lines.push(`Attendees: ${attendees.join(', ')}`)
  if (description.trim()) { lines.push(''); lines.push(`Description: ${description}`) }
  lines.push('')
  lines.push('Generate a concise meeting prep brief with: key topics to cover, questions to ask, and any important context. Use bullet points.')

  const res = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: lines.join('\n') }] }),
  })
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return (data?.choices?.[0]?.message?.content ?? '').trim()
}

export async function generateMeetingFollowUp(
  apiKey: string,
  context: {
    title: string
    attendees: string[]
    startTime: string
    transcript: string
    persistentInstructions: string
  }
): Promise<string> {
  const { title, attendees, startTime, transcript, persistentInstructions } = context
  const lines: string[] = []
  if (persistentInstructions.trim()) { lines.push(persistentInstructions.trim()); lines.push('') }
  lines.push('Draft a follow-up email for a meeting I just had.')
  lines.push(`Meeting: ${title}`)
  lines.push(`Date: ${startTime}`)
  if (attendees.length) lines.push(`Attendees: ${attendees.join(', ')}`)
  lines.push('')
  lines.push('--- Meeting notes / transcript ---')
  lines.push(transcript)
  lines.push('--- End ---')
  lines.push('')
  lines.push('Write a professional follow-up email summarizing key decisions, action items, and next steps.')

  const res = await fetch(OPENAI_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({ model: MODEL, messages: [{ role: 'user', content: lines.join('\n') }] }),
  })
  if (!res.ok) throw new Error(`OpenAI API error ${res.status}: ${await res.text()}`)
  const data = await res.json()
  return (data?.choices?.[0]?.message?.content ?? '').trim()
}

export function buildEmailReplyPrompt(context: {
  senderName: string
  senderEmail: string
  subject: string
  body: string
  persistentInstructions: string
}): string {
  const { senderName, senderEmail, subject, body, persistentInstructions } = context

  const lines: string[] = []

  if (persistentInstructions.trim()) {
    lines.push(persistentInstructions.trim())
    lines.push('')
  }

  lines.push('Draft a reply to the following email.')
  lines.push('')
  lines.push(`From: ${senderName} <${senderEmail}>`)
  lines.push(`Subject: ${subject}`)
  lines.push('')
  lines.push('--- Email ---')
  lines.push(body)
  lines.push('--- End email ---')
  lines.push('')
  lines.push('Reply:')

  return lines.join('\n')
}
