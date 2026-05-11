import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import type { TaskEnrichment, TaskFilters, Category, Priority, Effort, StatusCustom } from '../types'

export function useTasks(userId: string | null, filters?: TaskFilters) {
  const [tasks, setTasks] = useState<TaskEnrichment[]>([])
  const [loading, setLoading] = useState(true)
  const [sourceListOptions, setSourceListOptions] = useState<string[]>([])

  const fetchTasks = useCallback(async () => {
    if (!userId) return
    setLoading(true)

    const { data, error } = await supabase
      .from('task_enrichment')
      .select('*')
      .eq('user_id', userId)
      .eq('source', 'google_tasks')
      .neq('google_status', 'completed')
      .order('due_date', { ascending: true, nullsFirst: false })

    if (error) {
      console.error('Error fetching tasks:', error)
      setLoading(false)
      return
    }

    const allTasks = (data ?? []) as TaskEnrichment[]

    const lists = [...new Set(allTasks.map((t) => t.list_name).filter(Boolean))] as string[]
    setSourceListOptions(lists)

    let filtered = allTasks
    if (filters?.category) filtered = filtered.filter((t) => t.category === filters.category)
    if (filters?.priority) filtered = filtered.filter((t) => t.priority === filters.priority)
    if (filters?.effort) filtered = filtered.filter((t) => t.effort === filters.effort)
    if (filters?.status) filtered = filtered.filter((t) => t.status_custom === filters.status)
    if (filters?.sourceList) filtered = filtered.filter((t) => t.list_name === filters.sourceList)
    if (filters?.search) {
      const q = filters.search.toLowerCase()
      filtered = filtered.filter(
        (t) =>
          t.title?.toLowerCase().includes(q) ||
          t.notes?.toLowerCase().includes(q) ||
          t.next_action?.toLowerCase().includes(q)
      )
    }

    setTasks(filtered)
    setLoading(false)
  }, [userId, filters?.category, filters?.priority, filters?.effort, filters?.status, filters?.sourceList, filters?.search])

  useEffect(() => {
    fetchTasks()
  }, [fetchTasks])

  const updateEnrichment = useCallback(
    async (
      taskId: string,
      updates: Partial<{
        category: Category | null
        priority: Priority | null
        effort: Effort | null
        status_custom: StatusCustom
        next_action: string | null
        related_entity: string | null
      }>
    ) => {
      const { error } = await supabase
        .from('task_enrichment')
        .update(updates)
        .eq('id', taskId)

      if (error) {
        console.error('Error updating enrichment:', error)
        return false
      }

      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, ...updates } : t))
      )
      return true
    },
    []
  )

  const removeTask = useCallback((taskId: string) => {
    setTasks((prev) => prev.filter((t) => t.id !== taskId))
  }, [])

  return { tasks, loading, fetchTasks, updateEnrichment, removeTask, sourceListOptions }
}
