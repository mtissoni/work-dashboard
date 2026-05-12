// Supabase Edge Function: fetch RSS/Atom feeds server-side (bypasses CORS)
// Deploy: npx supabase functions deploy fetch-feeds

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface FeedRequest {
  feeds: { url: string; feed_type: string }[]
}

interface ParsedItem {
  feed_url: string
  title: string
  url: string
  author: string | null
  summary: string | null
  thumbnail_url: string | null
  published_at: string
  external_id: string
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Verify auth
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Missing auth' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabase.auth.getUser()
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { feeds } = (await req.json()) as FeedRequest

    // Fetch all feeds in parallel with timeout
    const results = await Promise.allSettled(
      feeds.map(async (feed) => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 8000)

        try {
          const res = await fetch(feed.url, {
            signal: controller.signal,
            headers: { 'User-Agent': 'WorkDashboard/1.0' },
          })
          clearTimeout(timeout)

          if (!res.ok) return []

          const xml = await res.text()
          return parseXml(xml, feed.url)
        } catch {
          clearTimeout(timeout)
          return []
        }
      })
    )

    const items: ParsedItem[] = results.flatMap((r) =>
      r.status === 'fulfilled' ? r.value : []
    )

    return new Response(JSON.stringify({ items }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})

function parseXml(xml: string, feedUrl: string): ParsedItem[] {
  const items: ParsedItem[] = []

  // Detect Atom vs RSS
  const isAtom = xml.includes('<feed') && xml.includes('<entry')

  if (isAtom) {
    // Atom format (YouTube, some blogs)
    const entries = xml.split('<entry')
    for (let i = 1; i < entries.length; i++) {
      const entry = entries[i]
      const title = extractTag(entry, 'title')
      const link = extractAtomLink(entry) ?? extractTag(entry, 'link')
      const author = extractTag(entry, 'name') // nested in <author><name>
      const summary = extractTag(entry, 'summary') ?? extractTag(entry, 'content')
      const published = extractTag(entry, 'published') ?? extractTag(entry, 'updated')
      const id = extractTag(entry, 'id') ?? link

      // YouTube thumbnail
      let thumbnail: string | null = null
      const thumbMatch = entry.match(/url="(https:\/\/i[^"]*ytimg[^"]*)"/)
      if (thumbMatch) {
        thumbnail = thumbMatch[1]
      }

      if (title && link) {
        items.push({
          feed_url: feedUrl,
          title: stripHtml(title),
          url: link,
          author: author ? stripHtml(author) : null,
          summary: summary ? stripHtml(summary).slice(0, 500) : null,
          thumbnail_url: thumbnail,
          published_at: published ? new Date(published).toISOString() : new Date().toISOString(),
          external_id: id ?? link,
        })
      }
    }
  } else {
    // RSS format
    const rssItems = xml.split('<item')
    for (let i = 1; i < rssItems.length; i++) {
      const item = rssItems[i]
      const title = extractTag(item, 'title')
      const link = extractTag(item, 'link')
      const author = extractTag(item, 'dc:creator') ?? extractTag(item, 'author')
      const summary = extractTag(item, 'description')
      const published = extractTag(item, 'pubDate')
      const guid = extractTag(item, 'guid') ?? link

      // Media thumbnail
      let thumbnail: string | null = null
      const mediaMatch = item.match(/url="(https?:\/\/[^"]+\.(jpg|jpeg|png|webp)[^"]*)"/)
      if (mediaMatch) {
        thumbnail = mediaMatch[1]
      }

      if (title && link) {
        items.push({
          feed_url: feedUrl,
          title: stripHtml(title),
          url: link,
          author: author ? stripHtml(author) : null,
          summary: summary ? stripHtml(summary).slice(0, 500) : null,
          thumbnail_url: thumbnail,
          published_at: published ? new Date(published).toISOString() : new Date().toISOString(),
          external_id: guid ?? link,
        })
      }
    }
  }

  return items
}

function extractTag(xml: string, tag: string): string | null {
  // Handle CDATA
  const cdataRegex = new RegExp(`<${tag}[^>]*>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>\\s*</${tag}>`)
  const cdataMatch = xml.match(cdataRegex)
  if (cdataMatch) return cdataMatch[1].trim()

  // Handle regular tags
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`)
  const match = xml.match(regex)
  return match ? match[1].trim() : null
}

function extractAtomLink(entry: string): string | null {
  // Atom links are self-closing: <link rel="alternate" href="..."/>
  const match = entry.match(/<link[^>]*rel="alternate"[^>]*href="([^"]+)"/)
    ?? entry.match(/<link[^>]*href="([^"]+)"[^>]*rel="alternate"/)
    ?? entry.match(/<link[^>]*href="([^"]+)"/)
  return match ? match[1] : null
}

function stripHtml(text: string): string {
  return text
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .trim()
}
