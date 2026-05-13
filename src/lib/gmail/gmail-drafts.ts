export async function createDraft(
  googleToken: string,
  params: {
    to: string
    subject: string
    body: string
    threadId: string
    messageId: string
  }
): Promise<void> {
  const { to, subject, body, threadId, messageId } = params

  const subjectLine = subject.toLowerCase().startsWith('re:')
    ? subject
    : `Re: ${subject}`

  const rfc2822 = [
    `To: ${to}`,
    `Subject: ${subjectLine}`,
    messageId ? `In-Reply-To: ${messageId}` : '',
    messageId ? `References: ${messageId}` : '',
    'Content-Type: text/plain; charset=UTF-8',
    '',
    body,
  ]
    .filter((line, i) => line !== '' || i > 4)
    .join('\r\n')

  const encoded = btoa(unescape(encodeURIComponent(rfc2822)))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')

  const res = await fetch('https://gmail.googleapis.com/gmail/v1/users/me/drafts', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${googleToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      message: { threadId, raw: encoded },
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Gmail Drafts API error ${res.status}: ${err}`)
  }
}
