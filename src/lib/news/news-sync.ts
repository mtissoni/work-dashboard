import { supabase } from '../supabase'
import { DEFAULT_FEEDS, AI_KEYWORDS } from './feed-urls'
import type { FeedSource } from '../../types'

export interface NewsSyncResult {
  itemCount: number
  status: 'success' | 'error'
  error?: string
}

export async function syncNewsFeeds(userId: string): Promise<NewsSyncResult> {
  try {
    // 1. Get or seed feed sources
    let { data: sources } = await supabase
      .from('feed_source')
      .select('*')
      .eq('user_id', userId)

    if (!sources || sources.length === 0) {
      // Seed defaults on first run
      const rows = DEFAULT_FEEDS.map((f) => ({
        user_id: userId,
        name: f.name,
        feed_url: f.feed_url,
        feed_type: f.feed_type,
      }))
      const { data: inserted } = await supabase
        .from('feed_source')
        .upsert(rows, { onConflict: 'user_id,feed_url' })
        .select()
      sources = inserted ?? []
    }

    const enabledSources = (sources as FeedSource[]).filter((s) => s.enabled)
    if (enabledSources.length === 0) {
      return { itemCount: 0, status: 'success' }
    }

    // 2. Call Edge Function to fetch feeds server-side
    const { data: fnData, error: fnError } = await supabase.functions.invoke('fetch-feeds', {
      body: {
        feeds: enabledSources.map((s) => ({ url: s.feed_url, feed_type: s.feed_type })),
      },
    })

    if (fnError) {
      throw new Error(`Edge function error: ${fnError.message}`)
    }

    const items = fnData?.items ?? []

    // 3. Build a lookup: feed_url → source
    const urlToSource = new Map<string, FeedSource>()
    for (const s of enabledSources) {
      urlToSource.set(s.feed_url, s)
    }

    // 4. Upsert items into feed_item
    let count = 0
    for (const item of items) {
      const source = urlToSource.get(item.feed_url)
      if (!source) continue

      // Filter general tech feeds to AI-relevant content only
      const isGeneralFeed =
        source.name === 'Ars Technica' || source.name === 'MIT Tech Review'
      if (isGeneralFeed) {
        const text = `${item.title} ${item.summary ?? ''}`
        if (!AI_KEYWORDS.test(text)) continue
      }

      const { error } = await supabase.from('feed_item').upsert(
        {
          user_id: userId,
          source_id: source.id,
          external_id: item.external_id,
          feed_type: source.feed_type,
          title: item.title,
          url: item.url,
          author: item.author,
          summary: item.summary,
          thumbnail_url: item.thumbnail_url,
          published_at: item.published_at,
        },
        {
          onConflict: 'user_id,external_id',
          ignoreDuplicates: false,
        }
      )

      if (error) {
        console.error('Feed item upsert error:', item.external_id, error)
      } else {
        count++
      }
    }

    await supabase.from('sync_log').insert({
      user_id: userId,
      source: 'news_feeds',
      task_count: count,
      status: 'success',
    })

    return { itemCount: count, status: 'success' }
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown news sync error'
    console.error('News sync failed:', message)
    return { itemCount: 0, status: 'error', error: message }
  }
}
