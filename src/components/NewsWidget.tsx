import type { FeedItem, ViewType } from '../types'

interface NewsWidgetProps {
  todayVideo: FeedItem | null
  todayArticle: FeedItem | null
  unreadCount: number
  onNavigate: (view: ViewType) => void
  onMarkRead: (id: string) => void
}

export function NewsWidget({
  todayVideo,
  todayArticle,
  unreadCount,
  onNavigate,
  onMarkRead,
}: NewsWidgetProps) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">AI News</h2>
        <button
          onClick={() => onNavigate('news')}
          className="text-sm text-blue-600 hover:text-blue-700 cursor-pointer"
        >
          View All{unreadCount > 0 && ` (${unreadCount})`}
        </button>
      </div>

      <div className="space-y-3">
        {/* Video of the Day */}
        <PickCard
          label="Video of the Day"
          item={todayVideo}
          onMarkRead={onMarkRead}
        />

        {/* Article of the Day */}
        <PickCard
          label="Article of the Day"
          item={todayArticle}
          onMarkRead={onMarkRead}
        />

        {!todayVideo && !todayArticle && (
          <p className="text-sm text-gray-400 py-2 text-center">
            All caught up! Sync to check for new content.
          </p>
        )}
      </div>
    </div>
  )
}

function PickCard({
  label,
  item,
  onMarkRead,
}: {
  label: string
  item: FeedItem | null
  onMarkRead: (id: string) => void
}) {
  if (!item) return null

  const handleClick = () => {
    window.open(item.url, '_blank')
    onMarkRead(item.id)
  }

  return (
    <div
      onClick={handleClick}
      className="flex gap-3 p-2 -mx-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
    >
      {item.thumbnail_url ? (
        <img
          src={item.thumbnail_url}
          alt=""
          className="w-20 h-14 rounded object-cover flex-shrink-0"
        />
      ) : (
        <div className="w-20 h-14 rounded bg-gray-100 flex items-center justify-center flex-shrink-0">
          <span className="text-lg">{item.feed_type === 'video' ? '🎬' : '📄'}</span>
        </div>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-xs text-gray-400 uppercase tracking-wider">{label}</p>
        <p className="text-sm font-medium text-gray-800 line-clamp-2">{item.title}</p>
        <p className="text-xs text-gray-400 mt-0.5">{item.author}</p>
      </div>
    </div>
  )
}
