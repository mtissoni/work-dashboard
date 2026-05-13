export interface TaskEnrichment {
  id: string
  user_id: string
  source: string
  external_id: string
  list_id: string | null
  list_name: string | null
  parent_external_id: string | null
  position: string | null
  category: Category | null
  priority: Priority | null
  effort: Effort | null
  status_custom: StatusCustom
  next_action: string | null
  related_entity: string | null
  title: string | null
  notes: string | null
  due_date: string | null
  google_status: string | null
  google_updated_at: string | null
  created_at: string
  updated_at: string
}

export type Category =
  | 'Client'
  | 'Internal'
  | 'Sales'
  | 'AI Studio'
  | 'Content'
  | 'Admin'
  | 'Personal'
  | 'Other'

export type Priority = 'High' | 'Medium' | 'Low'

export type Effort = 'High' | 'Medium' | 'Low'

export type StatusCustom =
  | 'Not Started'
  | 'In Progress'
  | 'Waiting'
  | 'Blocked'
  | 'Done'

export const CATEGORIES: Category[] = [
  'Client',
  'Internal',
  'Sales',
  'AI Studio',
  'Content',
  'Admin',
  'Personal',
  'Other',
]

export const PRIORITIES: Priority[] = ['High', 'Medium', 'Low']

export const EFFORTS: Effort[] = ['High', 'Medium', 'Low']

export const STATUSES: StatusCustom[] = [
  'Not Started',
  'In Progress',
  'Waiting',
  'Blocked',
  'Done',
]

export interface GoogleTaskList {
  id: string
  title: string
}

export interface GoogleTask {
  id: string
  title: string
  notes?: string
  due?: string
  status: 'needsAction' | 'completed'
  updated: string
  parent?: string
  position?: string
}

export interface TaskFilters {
  category?: Category | null
  priority?: Priority | null
  effort?: Effort | null
  status?: StatusCustom | null
  sourceList?: string | null
  search?: string
}

export type ViewType = 'dashboard' | 'lists' | 'today' | 'all' | 'overdue' | 'category' | 'inbox' | 'news' | 'calendar' | 'templates' | 'clickup'

// Recurring task types

export type RecurrenceType = 'daily' | 'weekly' | 'monthly'

export interface RecurrenceRule {
  type: RecurrenceType
  days?: number[]       // For weekly: 0=Sun through 6=Sat
  day_of_month?: number // For monthly: 1-31
}

export interface RecurringTemplate {
  id: string
  user_id: string
  title: string
  notes: string | null
  list_id: string
  list_name: string | null
  category: Category | null
  priority: Priority | null
  effort: Effort | null
  recurrence_rule: RecurrenceRule
  enabled: boolean
  last_generated_date: string | null
  created_at: string
  updated_at: string
}

export interface RecurringTaskLog {
  id: string
  user_id: string
  template_id: string
  generated_date: string
  external_id: string
  created_at: string
}

// Calendar types

export interface CalendarEvent {
  id: string
  summary: string
  description?: string
  location?: string
  start: { dateTime?: string; date?: string; timeZone?: string }
  end: { dateTime?: string; date?: string; timeZone?: string }
  htmlLink: string
  status: string
  organizer?: { email: string; displayName?: string; self?: boolean }
  attendees?: { email: string; displayName?: string; responseStatus: string; self?: boolean }[]
  conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] }
}

// News feed types

export type FeedType = 'article' | 'video' | 'netsuite'

export interface FeedSource {
  id: string
  user_id: string
  name: string
  feed_url: string
  feed_type: FeedType
  enabled: boolean
  created_at: string
}

export interface FeedItem {
  id: string
  user_id: string
  source_id: string
  external_id: string
  feed_type: FeedType
  title: string
  url: string
  author: string | null
  summary: string | null
  thumbnail_url: string | null
  published_at: string
  is_read: boolean
  is_starred: boolean
  created_at: string
  updated_at: string
}

// Gmail types

export interface GmailMessage {
  id: string
  threadId: string
  labelIds: string[]
  snippet: string
  payload: {
    headers: { name: string; value: string }[]
    mimeType: string
    body?: { data?: string }
    parts?: GmailMessagePart[]
  }
  internalDate: string
}

export interface GmailMessagePart {
  mimeType: string
  body?: { data?: string }
  parts?: GmailMessagePart[]
}

export interface EmailCacheRow {
  id: string
  user_id: string
  gmail_id: string
  thread_id: string
  subject: string | null
  sender_name: string | null
  sender_email: string | null
  snippet: string | null
  received_at: string
  label_ids: string[]
  is_unread: boolean
  is_starred: boolean
  is_actionable: boolean
  action_reason: string | null
  triaged_at: string | null
  triage_action: string | null
  linked_task_id: string | null
  created_at: string
  updated_at: string
}

// ClickUp types

export interface ClickUpTeam {
  id: string
  name: string
}

export interface ClickUpSpace {
  id: string
  name: string
}

export interface ClickUpFolder {
  id: string
  name: string
  lists: ClickUpList[]
}

export interface ClickUpList {
  id: string
  name: string
}

export interface ClickUpTaskRow {
  id: string
  user_id: string
  clickup_id: string
  list_id: string
  list_name: string | null
  folder_name: string | null
  space_name: string | null
  name: string
  description: string | null
  status_name: string | null
  status_color: string | null
  priority_val: number | null
  priority_label: string | null
  assignees: { id: number; username: string; profilePicture: string | null }[]
  tags: { name: string; tag_fg: string; tag_bg: string }[]
  due_date: string | null
  date_created: string | null
  date_updated: string | null
  url: string | null
  created_at: string
  updated_at: string
}

export interface ClickUpHierarchyNode {
  id: string
  user_id: string
  team_id: string
  team_name: string | null
  space_id: string | null
  space_name: string | null
  folder_id: string | null
  folder_name: string | null
  list_id: string | null
  list_name: string | null
  node_type: 'team' | 'space' | 'folder' | 'list'
}

export interface CreateClickUpTask {
  name: string
  description?: string
  priority?: number
  due_date?: number // Unix ms
}

export interface UserSettings {
  id: string
  user_id: string
  clickup_api_token: string | null
  clickup_folder_id: string | null
  clickup_space_id: string | null
  openai_api_key: string | null
  ai_instructions: string | null
  created_at: string
  updated_at: string
}
