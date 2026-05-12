import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  fetchTeams,
  fetchSpaces,
  fetchFolders,
  fetchFolderLists,
  createList as apiCreateList,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
} from '../lib/clickup/clickup-api'
import type { ClickUpTaskRow, ClickUpList } from '../types'

const TEAM_NAME = 'tavano team'
const FOLDER_NAME = 'dolphia'

export interface ClickUpState {
  lists: ClickUpList[]
  folderId: string | null
  selectedListId: string | null
  selectedListName: string | null
}

export function useClickUp(userId: string | null) {
  const [token, setToken] = useState<string | null>(null)
  const [tokenLoading, setTokenLoading] = useState(true)
  const [discovering, setDiscovering] = useState(false)
  const [discoveryError, setDiscoveryError] = useState<string | null>(null)
  const [tasks, setTasks] = useState<ClickUpTaskRow[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [state, setState] = useState<ClickUpState>({
    lists: [],
    folderId: null,
    selectedListId: null,
    selectedListName: null,
  })

  // Load token + cached folder ID from user_settings
  useEffect(() => {
    if (!userId) {
      setTokenLoading(false)
      return
    }
    supabase
      .from('user_settings')
      .select('clickup_api_token, clickup_folder_id, clickup_space_id')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setToken(data?.clickup_api_token ?? null)
        if (data?.clickup_folder_id) {
          setState((prev) => ({ ...prev, folderId: data.clickup_folder_id }))
        }
        setTokenLoading(false)
      })
  }, [userId])

  // Auto-load lists when token + folderId are known
  useEffect(() => {
    if (!token || !state.folderId) return
    fetchFolderLists(token, state.folderId)
      .then((lists) => setState((prev) => ({ ...prev, lists })))
      .catch(console.error)
  }, [token, state.folderId])

  // Auto-discover Tavano Team → Dolphia folder when token is set but folderId is not cached
  const discover = useCallback(
    async (tok: string): Promise<string | null> => {
      setDiscovering(true)
      setDiscoveryError(null)
      try {
        // 1. Find Tavano Team
        const teams = await fetchTeams(tok)
        const team = teams.find((t) => t.name.toLowerCase().includes(TEAM_NAME))
        if (!team) {
          setDiscoveryError(`Could not find a team matching "${TEAM_NAME}". Check your token.`)
          setDiscovering(false)
          return null
        }

        // 2. Get spaces for that team
        const spaces = await fetchSpaces(tok, team.id)
        if (spaces.length === 0) {
          setDiscoveryError('No spaces found in the Tavano Team workspace.')
          setDiscovering(false)
          return null
        }
        // Use first space (or find the right one if multiple)
        const space = spaces[0]

        // 3. Find Dolphia folder
        const folders = await fetchFolders(tok, space.id)
        const folder = folders.find((f) => f.name.toLowerCase().includes(FOLDER_NAME))
        if (!folder) {
          setDiscoveryError(`Could not find a folder matching "${FOLDER_NAME}" in the workspace.`)
          setDiscovering(false)
          return null
        }

        // 4. Cache folder + space IDs in user_settings
        if (userId) {
          await supabase.from('user_settings').upsert(
            { user_id: userId, clickup_folder_id: folder.id, clickup_space_id: space.id },
            { onConflict: 'user_id' }
          )
        }

        // 5. Load lists from the folder
        const lists = await fetchFolderLists(tok, folder.id)
        setState((prev) => ({
          ...prev,
          folderId: folder.id,
          lists,
        }))

        setDiscovering(false)
        return folder.id
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setDiscoveryError(`Discovery failed: ${msg}`)
        setDiscovering(false)
        return null
      }
    },
    [userId]
  )

  // Save token and trigger discovery
  const saveToken = useCallback(
    async (newToken: string): Promise<boolean> => {
      if (!userId) return false
      const { error } = await supabase.from('user_settings').upsert(
        { user_id: userId, clickup_api_token: newToken },
        { onConflict: 'user_id' }
      )
      if (error) {
        console.error('Error saving ClickUp token:', error)
        return false
      }
      setToken(newToken)
      // Trigger discovery immediately
      await discover(newToken)
      return true
    },
    [userId, discover]
  )

  const removeToken = useCallback(async (): Promise<boolean> => {
    if (!userId) return false
    await supabase
      .from('user_settings')
      .update({ clickup_api_token: null, clickup_folder_id: null, clickup_space_id: null })
      .eq('user_id', userId)
    setToken(null)
    setState({ lists: [], folderId: null, selectedListId: null, selectedListName: null })
    setTasks([])
    return true
  }, [userId])

  // Refresh lists (e.g. after creating one)
  const refreshLists = useCallback(async () => {
    if (!token || !state.folderId) return
    try {
      const lists = await fetchFolderLists(token, state.folderId)
      setState((prev) => ({ ...prev, lists }))
    } catch (err) {
      console.error('Error refreshing lists:', err)
    }
  }, [token, state.folderId])

  // Select a list → load tasks from Supabase cache
  const selectList = useCallback(
    async (listId: string, listName: string) => {
      if (!userId) return
      setState((prev) => ({ ...prev, selectedListId: listId, selectedListName: listName }))
      setTasksLoading(true)
      const { data, error } = await supabase
        .from('clickup_task')
        .select('*')
        .eq('user_id', userId)
        .eq('list_id', listId)
        .order('date_updated', { ascending: false })
      if (error) {
        console.error('Error loading tasks:', error)
      } else {
        setTasks((data ?? []) as ClickUpTaskRow[])
      }
      setTasksLoading(false)
    },
    [userId]
  )

  // Refresh tasks from cache after sync
  const refreshTasks = useCallback(async () => {
    if (!userId || !state.selectedListId) return
    const { data } = await supabase
      .from('clickup_task')
      .select('*')
      .eq('user_id', userId)
      .eq('list_id', state.selectedListId)
      .order('date_updated', { ascending: false })
    setTasks((data ?? []) as ClickUpTaskRow[])
  }, [userId, state.selectedListId])

  // Create a new list in Dolphia folder
  const createList = useCallback(
    async (name: string): Promise<boolean> => {
      if (!token || !state.folderId) return false
      try {
        await apiCreateList(token, state.folderId, name)
        await refreshLists()
        return true
      } catch (err) {
        console.error('Error creating list:', err)
        return false
      }
    },
    [token, state.folderId, refreshLists]
  )

  // Task CRUD
  const createTask = useCallback(
    async (task: { name: string; description?: string; priority?: number }): Promise<boolean> => {
      if (!token || !state.selectedListId || !userId) return false
      try {
        const created = await apiCreateTask(token, state.selectedListId, task)
        await supabase.from('clickup_task').upsert(
          {
            user_id: userId,
            clickup_id: created.id,
            list_id: created.list?.id ?? state.selectedListId,
            list_name: created.list?.name ?? state.selectedListName,
            name: created.name,
            description: created.description ?? null,
            status_name: created.status?.status ?? null,
            status_color: created.status?.color ?? null,
            priority_val: created.priority ? Number(created.priority.id) : null,
            priority_label: created.priority?.priority ?? null,
            assignees: created.assignees ?? [],
            tags: created.tags ?? [],
            due_date: created.due_date ? new Date(Number(created.due_date)).toISOString() : null,
            date_created: created.date_created ? new Date(Number(created.date_created)).toISOString() : null,
            date_updated: created.date_updated ? new Date(Number(created.date_updated)).toISOString() : null,
            url: created.url ?? null,
          },
          { onConflict: 'user_id,clickup_id' }
        )
        await refreshTasks()
        return true
      } catch (err) {
        console.error('Error creating task:', err)
        return false
      }
    },
    [token, userId, state.selectedListId, state.selectedListName, refreshTasks]
  )

  const updateTask = useCallback(
    async (
      clickupId: string,
      updates: { name?: string; description?: string; status?: string; priority?: number }
    ): Promise<boolean> => {
      if (!token) return false
      try {
        const updated = await apiUpdateTask(token, clickupId, updates)
        setTasks((prev) =>
          prev.map((t) =>
            t.clickup_id === clickupId
              ? {
                  ...t,
                  name: updated.name ?? t.name,
                  description: updated.description ?? t.description,
                  status_name: updated.status?.status ?? t.status_name,
                  status_color: updated.status?.color ?? t.status_color,
                  priority_val: updated.priority ? Number(updated.priority.id) : t.priority_val,
                  priority_label: updated.priority?.priority ?? t.priority_label,
                }
              : t
          )
        )
        return true
      } catch (err) {
        console.error('Error updating task:', err)
        return false
      }
    },
    [token]
  )

  const removeTask = useCallback(
    async (clickupId: string): Promise<boolean> => {
      if (!token || !userId) return false
      try {
        await apiDeleteTask(token, clickupId)
        await supabase
          .from('clickup_task')
          .delete()
          .eq('user_id', userId)
          .eq('clickup_id', clickupId)
        setTasks((prev) => prev.filter((t) => t.clickup_id !== clickupId))
        return true
      } catch (err) {
        console.error('Error deleting task:', err)
        return false
      }
    },
    [token, userId]
  )

  return {
    token,
    tokenLoading,
    discovering,
    discoveryError,
    saveToken,
    removeToken,
    tasks,
    tasksLoading,
    state,
    selectList,
    refreshTasks,
    refreshLists,
    createList,
    createTask,
    updateTask,
    removeTask,
  }
}
