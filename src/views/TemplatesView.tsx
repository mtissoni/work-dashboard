import { useState, useEffect, useCallback } from 'react'
import { fetchAllTaskLists } from '../lib/sync/google-tasks'
import { describeRule, getNextDueDate } from '../lib/recurring/recurrence'
import type {
  RecurringTemplate,
  RecurrenceRule,
  RecurrenceType,
  GoogleTaskList,
  Category,
  Priority,
  Effort,
} from '../types'

interface TemplatesViewProps {
  templates: RecurringTemplate[]
  loading: boolean
  googleToken: string | null
  refreshGoogleToken: () => Promise<string>
  onCreate: (data: {
    title: string
    notes?: string
    list_id: string
    list_name?: string
    category?: Category | null
    priority?: Priority | null
    effort?: Effort | null
    recurrence_rule: RecurrenceRule
  }) => Promise<boolean>
  onUpdate: (id: string, updates: Partial<RecurringTemplate>) => Promise<boolean>
  onToggle: (id: string, enabled: boolean) => Promise<boolean>
  onDelete: (id: string) => Promise<boolean>
}

const CATEGORY_OPTIONS: Category[] = ['Client', 'Internal', 'Sales', 'AI Studio', 'Content', 'Admin', 'Personal', 'Other']
const PRIORITY_OPTIONS: Priority[] = ['High', 'Medium', 'Low']
const EFFORT_OPTIONS: Effort[] = ['High', 'Medium', 'Low']

const DAY_LABELS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export function TemplatesView({
  templates,
  loading,
  googleToken,
  refreshGoogleToken,
  onCreate,
  onUpdate,
  onToggle,
  onDelete,
}: TemplatesViewProps) {
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [taskLists, setTaskLists] = useState<GoogleTaskList[]>([])
  const [listsLoading, setListsLoading] = useState(false)

  // Form state
  const [title, setTitle] = useState('')
  const [notes, setNotes] = useState('')
  const [listId, setListId] = useState('')
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('weekly')
  const [weekDays, setWeekDays] = useState<number[]>([1]) // Monday
  const [dayOfMonth, setDayOfMonth] = useState(1)
  const [category, setCategory] = useState<Category | ''>('')
  const [priority, setPriority] = useState<Priority | ''>('')
  const [effort, setEffort] = useState<Effort | ''>('')
  const [saving, setSaving] = useState(false)

  const loadTaskLists = useCallback(async () => {
    if (!googleToken) return
    setListsLoading(true)
    try {
      const lists = await fetchAllTaskLists(googleToken)
      setTaskLists(lists)
      if (lists.length > 0 && !listId) setListId(lists[0].id)
    } catch (err: any) {
      if (err?.message?.includes('401')) {
        const newToken = await refreshGoogleToken()
        const lists = await fetchAllTaskLists(newToken)
        setTaskLists(lists)
        if (lists.length > 0 && !listId) setListId(lists[0].id)
      }
    }
    setListsLoading(false)
  }, [googleToken, refreshGoogleToken, listId])

  useEffect(() => {
    if (showForm && taskLists.length === 0) loadTaskLists()
  }, [showForm, taskLists.length, loadTaskLists])

  const resetForm = () => {
    setTitle('')
    setNotes('')
    setListId(taskLists[0]?.id ?? '')
    setRecurrenceType('weekly')
    setWeekDays([1])
    setDayOfMonth(1)
    setCategory('')
    setPriority('')
    setEffort('')
    setEditingId(null)
    setShowForm(false)
  }

  const startEdit = (t: RecurringTemplate) => {
    setTitle(t.title)
    setNotes(t.notes ?? '')
    setListId(t.list_id)
    setRecurrenceType(t.recurrence_rule.type)
    setWeekDays(t.recurrence_rule.days ?? [1])
    setDayOfMonth(t.recurrence_rule.day_of_month ?? 1)
    setCategory(t.category ?? '')
    setPriority(t.priority ?? '')
    setEffort(t.effort ?? '')
    setEditingId(t.id)
    setShowForm(true)
    if (taskLists.length === 0) loadTaskLists()
  }

  const buildRule = (): RecurrenceRule => {
    switch (recurrenceType) {
      case 'daily':
        return { type: 'daily' }
      case 'weekly':
        return { type: 'weekly', days: weekDays }
      case 'monthly':
        return { type: 'monthly', day_of_month: dayOfMonth }
    }
  }

  const handleSubmit = async () => {
    if (!title.trim() || !listId) return
    setSaving(true)

    const rule = buildRule()
    const listName = taskLists.find((l) => l.id === listId)?.title ?? null

    if (editingId) {
      await onUpdate(editingId, {
        title: title.trim(),
        notes: notes.trim() || null,
        list_id: listId,
        list_name: listName,
        category: category || null,
        priority: priority || null,
        effort: effort || null,
        recurrence_rule: rule,
      } as Partial<RecurringTemplate>)
    } else {
      await onCreate({
        title: title.trim(),
        notes: notes.trim() || undefined,
        list_id: listId,
        list_name: listName ?? undefined,
        category: category || null,
        priority: priority || null,
        effort: effort || null,
        recurrence_rule: rule,
      })
    }

    setSaving(false)
    resetForm()
  }

  const toggleWeekDay = (day: number) => {
    setWeekDays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort()
    )
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Loading templates...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Recurring Templates</h1>
          <p className="text-sm text-gray-500 mt-1">
            Create templates that automatically generate Google Tasks on a schedule.
          </p>
        </div>
        {!showForm && (
          <button
            onClick={() => {
              setShowForm(true)
              setEditingId(null)
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors cursor-pointer"
          >
            + New Template
          </button>
        )}
      </div>

      {/* Create / Edit Form */}
      {showForm && (
        <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
          <h2 className="text-lg font-semibold text-gray-900">
            {editingId ? 'Edit Template' : 'New Template'}
          </h2>

          {/* Title */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Review weekly metrics"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional description..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
            />
          </div>

          {/* Task List */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Task List *</label>
            {listsLoading ? (
              <p className="text-sm text-gray-400">Loading lists...</p>
            ) : (
              <select
                value={listId}
                onChange={(e) => setListId(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                {taskLists.map((l) => (
                  <option key={l.id} value={l.id}>
                    {l.title}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Recurrence */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Recurrence</label>
            <div className="flex items-center gap-3">
              <select
                value={recurrenceType}
                onChange={(e) => setRecurrenceType(e.target.value as RecurrenceType)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>

              {recurrenceType === 'weekly' && (
                <div className="flex gap-1">
                  {DAY_LABELS.map((label, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => toggleWeekDay(i)}
                      className={`w-9 h-9 rounded-full text-xs font-medium transition-colors cursor-pointer ${
                        weekDays.includes(i)
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              )}

              {recurrenceType === 'monthly' && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">on day</span>
                  <input
                    type="number"
                    min={1}
                    max={31}
                    value={dayOfMonth}
                    onChange={(e) => setDayOfMonth(Math.min(31, Math.max(1, Number(e.target.value))))}
                    className="w-16 px-2 py-2 border border-gray-300 rounded-lg text-sm text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-1">{describeRule(buildRule())}</p>
          </div>

          {/* Defaults: Category, Priority, Effort */}
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as Category | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {CATEGORY_OPTIONS.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Priority</label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {PRIORITY_OPTIONS.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Effort</label>
              <select
                value={effort}
                onChange={(e) => setEffort(e.target.value as Effort | '')}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">None</option>
                {EFFORT_OPTIONS.map((e) => (
                  <option key={e} value={e}>{e}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={handleSubmit}
              disabled={saving || !title.trim() || !listId}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {saving ? 'Saving...' : editingId ? 'Update Template' : 'Create Template'}
            </button>
            <button
              onClick={resetForm}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 text-sm cursor-pointer"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Template List */}
      {templates.length === 0 && !showForm ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-400 text-lg mb-2">No recurring templates yet</p>
          <p className="text-gray-400 text-sm">
            Create a template to automatically generate tasks on a schedule.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {templates.map((t) => (
            <TemplateCard
              key={t.id}
              template={t}
              onToggle={onToggle}
              onEdit={startEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TemplateCard({
  template: t,
  onToggle,
  onEdit,
  onDelete,
}: {
  template: RecurringTemplate
  onToggle: (id: string, enabled: boolean) => Promise<boolean>
  onEdit: (t: RecurringTemplate) => void
  onDelete: (id: string) => Promise<boolean>
}) {
  const [toggling, setToggling] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const nextDue = getNextDueDate(t.recurrence_rule, new Date())
  const nextDueStr = nextDue.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })

  const handleToggle = async () => {
    setToggling(true)
    await onToggle(t.id, !t.enabled)
    setToggling(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(t.id)
    setDeleting(false)
  }

  const tags: { label: string; color: string }[] = []
  if (t.category) tags.push({ label: t.category, color: 'bg-blue-50 text-blue-700' })
  if (t.priority) tags.push({ label: t.priority, color: t.priority === 'High' ? 'bg-red-50 text-red-700' : 'bg-gray-100 text-gray-600' })
  if (t.effort) tags.push({ label: `${t.effort} effort`, color: 'bg-purple-50 text-purple-700' })

  return (
    <div
      className={`bg-white rounded-xl border p-4 transition-all ${
        t.enabled ? 'border-gray-200' : 'border-gray-100 opacity-60'
      }`}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3">
            <h3 className="text-sm font-semibold text-gray-900 truncate">{t.title}</h3>
            {!t.enabled && (
              <span className="text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">
                Paused
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
            <span>{describeRule(t.recurrence_rule)}</span>
            <span>*</span>
            <span>Next: {nextDueStr}</span>
            {t.list_name && (
              <>
                <span>*</span>
                <span>{t.list_name}</span>
              </>
            )}
          </div>

          {tags.length > 0 && (
            <div className="flex gap-1.5 mt-2">
              {tags.map((tag) => (
                <span
                  key={tag.label}
                  className={`text-xs px-2 py-0.5 rounded-full ${tag.color}`}
                >
                  {tag.label}
                </span>
              ))}
            </div>
          )}

          {t.notes && (
            <p className="text-xs text-gray-400 mt-1 truncate">{t.notes}</p>
          )}
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Toggle */}
          <button
            onClick={handleToggle}
            disabled={toggling}
            className="relative w-10 h-5 rounded-full transition-colors cursor-pointer"
            style={{ backgroundColor: t.enabled ? '#3b82f6' : '#d1d5db' }}
            title={t.enabled ? 'Pause' : 'Enable'}
          >
            <span
              className="absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform"
              style={{ transform: t.enabled ? 'translateX(20px)' : 'translateX(0)' }}
            />
          </button>

          {/* Edit */}
          <button
            onClick={() => onEdit(t)}
            className="p-1.5 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
            title="Edit"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
            </svg>
          </button>

          {/* Delete */}
          {showConfirm ? (
            <div className="flex items-center gap-1">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 cursor-pointer"
              >
                {deleting ? '...' : 'Yes'}
              </button>
              <button
                onClick={() => setShowConfirm(false)}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                No
              </button>
            </div>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              className="p-1.5 text-gray-400 hover:text-red-500 transition-colors cursor-pointer"
              title="Delete"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
