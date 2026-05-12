import { useState } from 'react'
import type { FeedItem, FeedType } from '../types'

interface NewsViewProps {
  items: FeedItem[]
  onMarkRead: (id: string) => void
  onToggleStar: (id: string, currentlyStarred: boolean) => void
}

type FilterTab = 'all' | FeedType | 'starred'

export function NewsView({ items, onMarkRead, onToggleStar }: NewsViewProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>('all')
  const [search, setSearch] = useState('')

  const filtered = items.filter((item) => {
    if (activeTab === 'starred' && !item.is_starred) return false
    if (activeTab !== 'all' && activeTab !== 'starred' && item.feed_type !== activeTab)
      return false
    if (
      search &&
      !item.title.toLowerCase().includes(search.toLowerCase()) &&
      !(item.author ?? '').toLowerCase().includes(search.toLowerCase()) &&
      !(item.summary ?? '').toLowerCase().includes(search.toLowerCase())
    )
      return false
    return true
  })

  const tabs: { key: FilterTab; label: string }[] = [
    { key: 'all', label: `All (${items.length})` },
    { key: 'article', label: `Articles` },
    { key: 'video', label: `Videos` },
    { key: 'netsuite', label: `NetSuite` },
    { key: 'starred', label: `Starred` },
  ]

  return (
    <div className="space-y-4 max-w-4xl">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">AI News</h1>
        <p className="text-sm text-gray-500 mt-1">
          {items.filter((i) => !i.is_read).length} unread items
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-3 py-1.5 text-xs rounded-md transition-colors cursor-pointer ${
                activeTab === tab.key
                  ? 'bg-white text-gray-900 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <input
          type="text"
          placeholder="Search news..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full max-w-xs"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center py-12 text-gray-400">
          {items.length === 0
            ? 'No news yet. Click Sync All to fetch feeds.'
            : 'No items match your filter.'}
        </p>
      ) : (
        <div className="space-y-2">
          {filtered.map((item) => (
            <NewsCard
              key={item.id}
              item={item}
              onMarkRead={onMarkRead}
              onToggleStar={onToggleStar}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function NewsCard({
  item,
  onMarkRead,
  onToggleStar,
}: {
  item: FeedItem
  onMarkRead: (id: string) => void
  onToggleStar: (id: string, starred: boolean) => void
}) {
  const handleOpen = () => {
    window.open(item.url, '_blank')
    if (!item.is_read) onMarkRead(item.id)
  }

  const typeIcon = item.feed_type === 'video' ? '🎬' : item.feed_type === 'netsuite' ? '💼' : '📄'
  const timeAgo = formatRelativeTime(item.published_at)

  return (
    <div
      className={`flex gap-3 p-3 rounded-lg border transition-colors hover:shadow-sm cursor-pointer group ${
        item.is_read
          ? 'bg-gray-50/50 border-gray-100'
          : 'bg-white border-gray-200'
      }`}
      onClick={handleOpen}
    >
      {item.thumbnail_url ? (
        <img
          src={item.thumbnail_url}
          alt=""
          className="w-28 h-20 rounded object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-28 h-20 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
          <span className="text-2xl">{typeIcon}</span>
        </div>
      )}

      <div className="flex-1 min-w-0">
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0">
            <p
              className={`text-sm line-clamp-2 ${
                item.is_read ? 'text-gray-500' : 'font-semibold text-gray-900'
              }`}
            >
              {item.title}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-400">{typeIcon}</span>
              {item.author && (
                <span className="text-xs text-gray-500">{item.author}</span>
              )}
              <span className="text-xs text-gray-400">{timeAgo}</span>
            </div>
            {item.summary && (
              <p className="text-xs text-gray-400 mt-1 line-clamp-1">
                {item.summary}
              </p>
            )}
          </div>

          <button
            onClick={(e) => {
              e.stopPropagation()
              onToggleStar(item.id, item.is_starred)
            }}
            className={`p-1 rounded cursor-pointer flex-shrink-0 ${
              item.is_starred
                ? 'text-yellow-400'
                : 'text-gray-300 opacity-0 group-hover:opacity-100'
            } hover:text-yellow-400 transition-all`}
          >
            <svg
              className="w-4 h-4"
              fill={item.is_starred ? 'currentColor' : 'none'}
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

function formatRelativeTime(dateStr: string): string {
  const date = new Date(dateStr)
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMin = Math.floor(diffMs / 60000)
  const diffHr = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHr / 24)

  if (diffMin < 1) return 'now'
  if (diffMin < 60) return `${diffMin}m ago`
  if (diffHr < 24) return `${diffHr}h ago`
  if (diffDay < 7) return `${diffDay}d ago`
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}
