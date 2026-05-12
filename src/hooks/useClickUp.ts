import { useState, useEffect, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import {
  fetchTeams,
  fetchSpaces,
  fetchFolders,
  fetchFolderlessLists,
  createTask as apiCreateTask,
  updateTask as apiUpdateTask,
  deleteTask as apiDeleteTask,
} from '../lib/clickup/clickup-api'
import type {
  ClickUpTaskRow,
  ClickUpTeam,
  ClickUpSpace,
  ClickUpFolder,
  ClickUpList,
} from '../types'

export interface HierarchyState {
  teams: ClickUpTeam[]
  spaces: ClickUpSpace[]
  folders: ClickUpFolder[]
  folderlessLists: ClickUpList[]
  selectedTeamId: string | null
  selectedSpaceId: string | null
  selectedListId: string | null
  selectedListName: string | null
}

export function useClickUp(userId: string | null) {
  const [token, setToken] = useState<string | null>(null)
  const [tokenLoading, setTokenLoading] = useState(true)
  const [tasks, setTasks] = useState<ClickUpTaskRow[]>([])
  const [tasksLoading, setTasksLoading] = useState(false)
  const [hierarchy, setHierarchy] = useState<HierarchyState>({
    teams: [],
    spaces: [],
    folders: [],
    folderlessLists: [],
    selectedTeamId: null,
    selectedSpaceId: null,
    selectedListId: null,
    selectedListName: null,
  })
  const [hierarchyLoading, setHierarchyLoading] = useState(false)

  // Load token from user_settings
  useEffect(() => {
    if (!userId) {
      setTokenLoading(false)
      return
    }
    supabase
      .from('user_settings')
      .select('clickup_api_token')
      .eq('user_id', userId)
      .maybeSingle()
      .then(({ data }) => {
        setToken(data?.clickup_api_token ?? null)
        setTokenLoading(false)
      })
  }, [userId])

  // Save token
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
      return true
    },
    [userId]
  )

  const removeToken = useCallback(
    async (): Promise<boolean> => {
      if (!userId) return false
      await supabase
        .from('user_settings')
        .update({ clickup_api_token: null })
        .eq('user_id', userId)
      setToken(null)
      setHierarchy({
        teams: [],
        spaces: [],
        folders: [],
        folderlessLists: [],
        selectedTeamId: null,
        selectedSpaceId: null,
        selectedListId: null,
        selectedListName: null,
      })
      setTasks([])
      return true
    },
    [userId]
  )

  // Fetch teams (top-level hierarchy)
  const loadTeams = useCallback(async () => {
    if (!token) return
    setHierarchyLoading(true)
    try {
      const teams = await fetchTeams(token)
      setHierarchy((prev) => ({
        ...prev,
        teams,
        spaces: [],
        folders: [],
        folderlessLists: [],
        selectedTeamId: teams.length === 1 ? teams[0].id : null,
        selectedSpaceId: null,
        selectedListId: null,
        selectedListName: null,
      }))
      // Auto-load spaces if single team
      if (teams.length === 1) {
        const spaces = await fetchSpaces(token, teams[0].id)
        setHierarchy((prev) => ({ ...prev, spaces }))
      }
    } catch (err) {
      console.error('Error loading ClickUp teams:', err)
    }
    setHierarchyLoading(false)
  }, [token])

  // Load spaces for selected team
  const selectTeam = useCallback(
    async (teamId: string) => {
      if (!token) return
      setHierarchyLoading(true)
      try {
        const spaces = await fetchSpaces(token, teamId)
        setHierarchy((prev) => ({
          ...prev,
          selectedTeamId: teamId,
          spaces,
          folders: [],
          folderlessLists: [],
          selectedSpaceId: null,
          selectedListId: null,
          selectedListName: null,
        }))
      } catch (err) {
        console.error('Error loading spaces:', err)
      }
      setHierarchyLoading(false)
    },
    [token]
  )

  // Load folders + folderless lists for selected space
  const selectSpace = useCallback(
    async (spaceId: string) => {
      if (!token) return
      setHierarchyLoading(true)
      try {
        const [folders, folderlessLists] = await Promise.all([
          fetchFolders(token, spaceId),
          fetchFolderlessLists(token, spaceId),
        ])
        setHierarchy((prev) => ({
          ...prev,
          selectedSpaceId: spaceId,
          folders,
          folderlessLists,
          selectedListId: null,
          selectedListName: null,
        }))
      } catch (err) {
        console.error('Error loading folders:', err)
      }
      setHierarchyLoading(false)
    },
    [token]
  )

  // Select a list and load tasks from cache
  const selectList = useCallback(
    async (listId: string, listName: string) => {
      if (!userId) return
      setHierarchy((prev) => ({ ...prev, selectedListId: listId, selectedListName: listName }))
      setTasksLoading(true)
      const { data, error } = await supabase
        .from('clickup_task')
        .select('*')
        .eq('user_id', userId)
        .eq('list_id', listId)
        .order('date_updated', { ascending: false })

      if (error) {
        console.error('Error loading ClickUp tasks:', error)
      } else {
        setTasks((data ?? []) as ClickUpTaskRow[])
      }
      setTasksLoading(false)
    },
    [userId]
  )

  // Refresh tasks from cache (after sync)
  const refreshTasks = useCallback(async () => {
    if (!userId || !hierarchy.selectedListId) return
    const { data } = await supabase
      .from('clickup_task')
      .select('*')
      .eq('user_id', userId)
      .eq('list_id', hierarchy.selectedListId)
      .order('date_updated', { ascending: false })

    setTasks((data ?? []) as ClickUpTaskRow[])
  }, [userId, hierarchy.selectedListId])

  // CRUD operations — call API first, then update local state

  const createTask = useCallback(
    async (task: { name: string; description?: string; priority?: number; due_date?: number }): Promise<boolean> => {
      if (!token || !hierarchy.selectedListId || !userId) return false
      try {
        const created = await apiCreateTask(token, hierarchy.selectedListId, task)
        // Upsert into cache
        await supabase.from('clickup_task').upsert(
          {
            user_id: userId,
            clickup_id: created.id,
            list_id: created.list?.id ?? hierarchy.selectedListId,
            list_name: created.list?.name ?? hierarchy.selectedListName,
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
        console.error('Error creating ClickUp task:', err)
        return false
      }
    },
    [token, userId, hierarchy.selectedListId, hierarchy.selectedListName, refreshTasks]
  )

  const updateTaskFields = useCallback(
    async (
      clickupId: string,
      updates: { name?: string; description?: string; status?: string; priority?: number; due_date?: number }
    ): Promise<boolean> => {
      if (!token) return false
      try {
        const updated = await apiUpdateTask(token, clickupId, updates)
        // Update cache
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
                  date_updated: updated.date_updated
                    ? new Date(Number(updated.date_updated)).toISOString()
                    : t.date_updated,
                }
              : t
          )
        )
        return true
      } catch (err) {
        console.error('Error updating ClickUp task:', err)
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
        // Remove from cache
        await supabase
          .from('clickup_task')
          .delete()
          .eq('user_id', userId)
          .eq('clickup_id', clickupId)
        setTasks((prev) => prev.filter((t) => t.clickup_id !== clickupId))
        return true
      } catch (err) {
        console.error('Error deleting ClickUp task:', err)
        return false
      }
    },
    [token, userId]
  )

  return {
    token,
    tokenLoading,
    saveToken,
    removeToken,
    tasks,
    tasksLoading,
    hierarchy,
    hierarchyLoading,
    loadTeams,
    selectTeam,
    selectSpace,
    selectList,
    refreshTasks,
    createTask,
    updateTask: updateTaskFields,
    removeTask,
  }
}
