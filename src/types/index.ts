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

export type ViewType = 'dashboard' | 'lists' | 'today' | 'all' | 'overdue' | 'category' | 'inbox'

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
