import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { RecurringTemplate, RecurrenceRule, Category, Priority, Effort } from '../types'

export function useRecurringTemplates(userId: string | null) {
  const [templates, setTemplates] = useState<RecurringTemplate[]>([])
  const [loading, setLoading] = useState(true)

  const fetchTemplates = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const { data, error } = await supabase
      .from('recurring_template')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Error fetching templates:', error)
    } else {
      setTemplates((data ?? []) as RecurringTemplate[])
    }
    setLoading(false)
  }, [userId])

  useEffect(() => {
    fetchTemplates()
  }, [fetchTemplates])

  const createTemplate = useCallback(
    async (data: {
      title: string
      notes?: string
      list_id: string
      list_name?: string
      category?: Category | null
      priority?: Priority | null
      effort?: Effort | null
      recurrence_rule: RecurrenceRule
    }): Promise<boolean> => {
      if (!userId) return false

      const { error } = await supabase.from('recurring_template').insert({
        user_id: userId,
        title: data.title,
        notes: data.notes ?? null,
        list_id: data.list_id,
        list_name: data.list_name ?? null,
        category: data.category ?? null,
        priority: data.priority ?? null,
        effort: data.effort ?? null,
        recurrence_rule: data.recurrence_rule,
      })

      if (error) {
        console.error('Error creating template:', error)
        return false
      }

      await fetchTemplates()
      return true
    },
    [userId, fetchTemplates]
  )

  const updateTemplate = useCallback(
    async (id: string, updates: Partial<RecurringTemplate>): Promise<boolean> => {
      const { error } = await supabase
        .from('recurring_template')
        .update(updates)
        .eq('id', id)

      if (error) {
        console.error('Error updating template:', error)
        return false
      }

      setTemplates((prev) =>
        prev.map((t) => (t.id === id ? { ...t, ...updates } : t))
      )
      return true
    },
    []
  )

  const toggleTemplate = useCallback(
    async (id: string, enabled: boolean): Promise<boolean> => {
      return updateTemplate(id, { enabled } as Partial<RecurringTemplate>)
    },
    [updateTemplate]
  )

  const deleteTemplate = useCallback(
    async (id: string): Promise<boolean> => {
      const { error } = await supabase
        .from('recurring_template')
        .delete()
        .eq('id', id)

      if (error) {
        console.error('Error deleting template:', error)
        return false
      }

      setTemplates((prev) => prev.filter((t) => t.id !== id))
      return true
    },
    []
  )

  const enabledCount = templates.filter((t) => t.enabled).length

  return {
    templates,
    loading,
    enabledCount,
    fetchTemplates,
    createTemplate,
    updateTemplate,
    toggleTemplate,
    deleteTemplate,
  }
}
