import { useState, useEffect, useCallback, useMemo } from 'react'
import { supabase } from '../lib/supabase'
import type { FeedItem } from '../types'

export function useNews(userId: string | null) {
  const [items, setItems] = useState<FeedItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchItems = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const { data, error } = await supabase
      .from('feed_item')
      .select('*')
      .eq('user_id', userId)
      .order('published_at', { ascending: false })
      .limit(200)

    if (error) {
      console.error('Error fetching news:', error)
    } else {
      setItems((data ?? []) as FeedItem[])
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchItems()
  }, [fetchItems])

  const markRead = useCallback(async (id: string) => {
    await supabase.from('feed_item').update({ is_read: true }).eq('id', id)
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, is_read: true } : i)))
  }, [])

  const toggleStar = useCallback(async (id: string, currentlyStarred: boolean) => {
    await supabase.from('feed_item').update({ is_starred: !currentlyStarred }).eq('id', id)
    setItems((prev) =>
      prev.map((i) => (i.id === id ? { ...i, is_starred: !currentlyStarred } : i))
    )
  }, [])

  // "Of the day" picks: latest unread of each type, stable for the day
  const todayVideo = useMemo(() => {
    const today = new Date().toDateString()
    const unreadVideos = items.filter((i) => i.feed_type === 'video' && !i.is_read)
    if (unreadVideos.length === 0) return null
    // Use date as seed for stable daily pick
    const idx = hashString(today) % unreadVideos.length
    return unreadVideos[idx]
  }, [items])

  const todayArticle = useMemo(() => {
    const today = new Date().toDateString()
    const unreadArticles = items.filter(
      (i) => (i.feed_type === 'article' || i.feed_type === 'netsuite') && !i.is_read
    )
    if (unreadArticles.length === 0) return null
    const idx = hashString(today + 'article') % unreadArticles.length
    return unreadArticles[idx]
  }, [items])

  const unreadCount = useMemo(() => items.filter((i) => !i.is_read).length, [items])

  return {
    items,
    loading,
    fetchItems,
    markRead,
    toggleStar,
    todayVideo,
    todayArticle,
    unreadCount,
  }
}

function hashString(str: string): number {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) - hash + str.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}
