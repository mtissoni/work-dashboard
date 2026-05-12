import type { FeedType } from '../../types'

export interface DefaultFeed {
  name: string
  feed_url: string
  feed_type: FeedType
}

export const DEFAULT_FEEDS: DefaultFeed[] = [
  // AI Articles
  { name: 'OpenAI Blog', feed_url: 'https://openai.com/blog/rss.xml', feed_type: 'article' },
  { name: 'Anthropic Blog', feed_url: 'https://www.anthropic.com/rss.xml', feed_type: 'article' },
  { name: 'The Verge AI', feed_url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml', feed_type: 'article' },
  { name: 'Ars Technica', feed_url: 'https://feeds.arstechnica.com/arstechnica/technology-lab', feed_type: 'article' },
  { name: 'MIT Tech Review', feed_url: 'https://www.technologyreview.com/feed/', feed_type: 'article' },
  { name: 'Hacker News AI', feed_url: 'https://hnrss.org/newest?q=AI+OR+LLM+OR+GPT+OR+Claude+OR+Anthropic+OR+OpenAI', feed_type: 'article' },

  // AI YouTube
  { name: 'Matt Wolfe', feed_url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCQMGKf5UjMFViJd0UGmFblA', feed_type: 'video' },
  { name: 'TheAIGRID', feed_url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCjFE4XXaGnKbr0JdBNIBL1g', feed_type: 'video' },
  { name: 'AI Explained', feed_url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCNJ1Ymd5yFuUPtn21xtR6Q', feed_type: 'video' },
  { name: 'Fireship', feed_url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCsBjURrPoezykLs9EqgamOA', feed_type: 'video' },
  { name: 'Two Minute Papers', feed_url: 'https://www.youtube.com/feeds/videos.xml?channel_id=UCbfYPyITQ-7l4upoX8nvctg', feed_type: 'video' },

  // NetSuite
  { name: 'Oracle NetSuite Blog', feed_url: 'https://blogs.oracle.com/netsuite/rss', feed_type: 'netsuite' },
  { name: 'ERP Today', feed_url: 'https://erp.today/feed/', feed_type: 'netsuite' },
]

// Keywords to filter general tech feeds (Ars Technica, MIT Tech Review) to AI-relevant content
export const AI_KEYWORDS = /\b(ai|artificial intelligence|llm|large language model|machine learning|deep learning|neural|gpt|claude|gemini|openai|anthropic|chatbot|generative|transformer|diffusion|copilot)\b/i
