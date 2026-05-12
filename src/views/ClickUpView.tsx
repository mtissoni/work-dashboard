import { useState, useEffect } from 'react'
import type { ClickUpTaskRow } from '../types'
import type { HierarchyState } from '../hooks/useClickUp'

interface ClickUpViewProps {
  token: string | null
  tokenLoading: boolean
  tasks: ClickUpTaskRow[]
  tasksLoading: boolean
  hierarchy: HierarchyState
  hierarchyLoading: boolean
  isSyncing: boolean
  onSaveToken: (token: string) => Promise<boolean>
  onRemoveToken: () => Promise<boolean>
  onLoadTeams: () => void
  onSelectTeam: (teamId: string) => void
  onSelectSpace: (spaceId: string) => void
  onSelectList: (listId: string, listName: string) => void
  onSyncList: () => void
  onCreate: (task: { name: string; description?: string; priority?: number; due_date?: number }) => Promise<boolean>
  onUpdate: (clickupId: string, updates: { name?: string; status?: string; priority?: number }) => Promise<boolean>
  onDelete: (clickupId: string) => Promise<boolean>
}

export function ClickUpView({
  token,
  tokenLoading,
  tasks,
  tasksLoading,
  hierarchy,
  hierarchyLoading,
  isSyncing,
  onSaveToken,
  onRemoveToken,
  onLoadTeams,
  onSelectTeam,
  onSelectSpace,
  onSelectList,
  onSyncList,
  onCreate,
  onUpdate,
  onDelete,
}: ClickUpViewProps) {
  const [showSettings, setShowSettings] = useState(false)
  const [tokenInput, setTokenInput] = useState('')
  const [savingToken, setSavingToken] = useState(false)

  // Load teams when token becomes available
  useEffect(() => {
    if (token && hierarchy.teams.length === 0) {
      onLoadTeams()
    }
  }, [token, hierarchy.teams.length, onLoadTeams])

  const handleSaveToken = async () => {
    if (!tokenInput.trim()) return
    setSavingToken(true)
    const ok = await onSaveToken(tokenInput.trim())
    setSavingToken(false)
    if (ok) {
      setShowSettings(false)
      setTokenInput('')
    }
  }

  if (tokenLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  // No token — show setup
  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-20">
        <div className="bg-white rounded-xl border border-gray-200 p-6 text-center space-y-4">
          <div className="text-4xl">🟣</div>
          <h2 className="text-xl font-semibold text-gray-900">Connect ClickUp</h2>
          <p className="text-sm text-gray-500">
            Enter your Personal API Token to browse and manage ClickUp tasks from the dashboard.
          </p>
          <p className="text-xs text-gray-400">
            Find it at: ClickUp → Settings → My Settings → Apps → API Token
          </p>
          <input
            type="password"
            value={tokenInput}
            onChange={(e) => setTokenInput(e.target.value)}
            placeholder="pk_..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleSaveToken}
            disabled={savingToken || !tokenInput.trim()}
            className="w-full px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {savingToken ? 'Connecting...' : 'Connect'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 max-w-5xl">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">ClickUp</h1>
          <p className="text-sm text-gray-500 mt-1">
            {hierarchy.selectedListName
              ? `Viewing: ${hierarchy.selectedListName}`
              : 'Select a list to view tasks'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {hierarchy.selectedListId && (
            <button
              onClick={onSyncList}
              disabled={isSyncing}
              className="px-3 py-1.5 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors cursor-pointer"
            >
              {isSyncing ? 'Syncing...' : 'Sync List'}
            </button>
          )}
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-3 py-1.5 text-gray-500 hover:text-gray-700 text-sm border border-gray-200 rounded-lg cursor-pointer"
          >
            ⚙️ Settings
          </button>
        </div>
      </div>

      {/* Settings Panel */}
      {showSettings && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-700">ClickUp Settings</h3>
          <p className="text-xs text-gray-400">Token: {token.slice(0, 6)}...{token.slice(-4)}</p>
          <button
            onClick={async () => {
              await onRemoveToken()
              setShowSettings(false)
            }}
            className="px-3 py-1.5 text-red-600 hover:text-red-700 text-sm border border-red-200 rounded-lg cursor-pointer"
          >
            Disconnect ClickUp
          </button>
        </div>
      )}

      <div className="flex gap-5">
        {/* Left: Hierarchy Navigator */}
        <div className="w-64 shrink-0">
          <div className="bg-white rounded-xl border border-gray-200 p-3 space-y-2">
            <h3 className="text-xs font-medium text-gray-500 uppercase tracking-wider px-1">
              Workspace
            </h3>

            {hierarchyLoading && (
              <p className="text-xs text-gray-400 px-1">Loading...</p>
            )}

            {/* Teams */}
            {hierarchy.teams.length > 1 && (
              <div className="space-y-0.5">
                {hierarchy.teams.map((team) => (
                  <button
                    key={team.id}
                    onClick={() => onSelectTeam(team.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm cursor-pointer transition-colors ${
                      hierarchy.selectedTeamId === team.id
                        ? 'bg-purple-50 text-purple-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    🏢 {team.name}
                  </button>
                ))}
              </div>
            )}

            {/* Spaces */}
            {hierarchy.spaces.length > 0 && (
              <div className="space-y-0.5">
                <p className="text-xs text-gray-400 px-1 pt-1">Spaces</p>
                {hierarchy.spaces.map((space) => (
                  <button
                    key={space.id}
                    onClick={() => onSelectSpace(space.id)}
                    className={`w-full text-left px-2 py-1.5 rounded text-sm cursor-pointer transition-colors ${
                      hierarchy.selectedSpaceId === space.id
                        ? 'bg-purple-50 text-purple-700 font-medium'
                        : 'text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    📂 {space.name}
                  </button>
                ))}
              </div>
            )}

            {/* Folders + Lists */}
            {hierarchy.selectedSpaceId && (
              <div className="space-y-0.5">
                {hierarchy.folders.map((folder) => (
                  <div key={folder.id}>
                    <p className="text-xs text-gray-400 px-1 pt-2">{folder.name}</p>
                    {folder.lists.map((list) => (
                      <button
                        key={list.id}
                        onClick={() => onSelectList(list.id, list.name)}
                        className={`w-full text-left px-2 py-1.5 rounded text-sm cursor-pointer transition-colors ${
                          hierarchy.selectedListId === list.id
                            ? 'bg-purple-50 text-purple-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        📋 {list.name}
                      </button>
                    ))}
                  </div>
                ))}

                {hierarchy.folderlessLists.length > 0 && (
                  <>
                    <p className="text-xs text-gray-400 px-1 pt-2">Lists</p>
                    {hierarchy.folderlessLists.map((list) => (
                      <button
                        key={list.id}
                        onClick={() => onSelectList(list.id, list.name)}
                        className={`w-full text-left px-2 py-1.5 rounded text-sm cursor-pointer transition-colors ${
                          hierarchy.selectedListId === list.id
                            ? 'bg-purple-50 text-purple-700 font-medium'
                            : 'text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        📋 {list.name}
                      </button>
                    ))}
                  </>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Task List */}
        <div className="flex-1 min-w-0">
          {!hierarchy.selectedListId ? (
            <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
              <p className="text-gray-400">Select a list from the sidebar to view tasks.</p>
            </div>
          ) : (
            <TaskList
              tasks={tasks}
              loading={tasksLoading}
              onCreate={onCreate}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          )}
        </div>
      </div>
    </div>
  )
}

// --- Task List ---

function TaskList({
  tasks,
  loading,
  onCreate,
  onUpdate,
  onDelete,
}: {
  tasks: ClickUpTaskRow[]
  loading: boolean
  onCreate: (task: { name: string; description?: string }) => Promise<boolean>
  onUpdate: (clickupId: string, updates: { name?: string; status?: string }) => Promise<boolean>
  onDelete: (clickupId: string) => Promise<boolean>
}) {
  const [newTaskName, setNewTaskName] = useState('')
  const [creating, setCreating] = useState(false)

  const handleCreate = async () => {
    if (!newTaskName.trim()) return
    setCreating(true)
    const ok = await onCreate({ name: newTaskName.trim() })
    if (ok) setNewTaskName('')
    setCreating(false)
  }

  return (
    <div className="space-y-3">
      {/* Inline Create */}
      <div className="bg-white rounded-xl border border-gray-200 p-3">
        <div className="flex gap-2">
          <input
            type="text"
            value={newTaskName}
            onChange={(e) => setNewTaskName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
            placeholder="New task name..."
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
          <button
            onClick={handleCreate}
            disabled={creating || !newTaskName.trim()}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {creating ? '...' : 'Add'}
          </button>
        </div>
      </div>

      {/* Tasks */}
      {loading ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-400">Loading tasks...</p>
        </div>
      ) : tasks.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-10 text-center">
          <p className="text-gray-400">No tasks in this list. Create one above.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {tasks.map((task) => (
            <TaskCard key={task.id} task={task} onUpdate={onUpdate} onDelete={onDelete} />
          ))}
        </div>
      )}
    </div>
  )
}

// --- Task Card ---

function TaskCard({
  task,
  onUpdate,
  onDelete,
}: {
  task: ClickUpTaskRow
  onUpdate: (clickupId: string, updates: { name?: string; status?: string }) => Promise<boolean>
  onDelete: (clickupId: string) => Promise<boolean>
}) {
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState(task.name)
  const [saving, setSaving] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const handleSave = async () => {
    if (!editName.trim() || editName.trim() === task.name) {
      setEditing(false)
      return
    }
    setSaving(true)
    await onUpdate(task.clickup_id, { name: editName.trim() })
    setSaving(false)
    setEditing(false)
  }

  const handleDelete = async () => {
    setDeleting(true)
    await onDelete(task.clickup_id)
    setDeleting(false)
  }

  const priorityColors: Record<string, string> = {
    urgent: 'bg-red-100 text-red-700',
    high: 'bg-orange-100 text-orange-700',
    normal: 'bg-blue-100 text-blue-700',
    low: 'bg-gray-100 text-gray-600',
  }

  const dueDate = task.due_date
    ? new Date(task.due_date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
    : null

  const isOverdue = task.due_date && new Date(task.due_date) < new Date() && task.status_name !== 'closed'

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 transition-all hover:shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {editing ? (
            <div className="flex gap-2">
              <input
                type="text"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSave()
                  if (e.key === 'Escape') setEditing(false)
                }}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="px-2 py-1 text-xs bg-purple-600 text-white rounded hover:bg-purple-700 cursor-pointer"
              >
                {saving ? '...' : 'Save'}
              </button>
              <button
                onClick={() => {
                  setEditing(false)
                  setEditName(task.name)
                }}
                className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 cursor-pointer"
              >
                Cancel
              </button>
            </div>
          ) : (
            <h3
              className="text-sm font-medium text-gray-900 cursor-pointer hover:text-purple-700"
              onClick={() => setEditing(true)}
            >
              {task.name}
            </h3>
          )}

          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            {/* Status */}
            {task.status_name && (
              <span
                className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                style={{ backgroundColor: task.status_color || '#808080' }}
              >
                {task.status_name}
              </span>
            )}

            {/* Priority */}
            {task.priority_label && (
              <span
                className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                  priorityColors[task.priority_label.toLowerCase()] ?? 'bg-gray-100 text-gray-600'
                }`}
              >
                {task.priority_label}
              </span>
            )}

            {/* Due date */}
            {dueDate && (
              <span
                className={`text-xs ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-500'}`}
              >
                {isOverdue ? '⚠️ ' : ''}
                {dueDate}
              </span>
            )}

            {/* Tags */}
            {task.tags?.map((tag: any) => (
              <span
                key={tag.name}
                className="text-xs px-1.5 py-0.5 rounded"
                style={{
                  backgroundColor: tag.tag_bg || '#e5e7eb',
                  color: tag.tag_fg || '#374151',
                }}
              >
                {tag.name}
              </span>
            ))}
          </div>

          {task.description && (
            <p className="text-xs text-gray-400 mt-1 truncate">{task.description}</p>
          )}
        </div>

        <div className="flex items-center gap-1 shrink-0">
          {/* Open in ClickUp */}
          {task.url && (
            <a
              href={task.url}
              target="_blank"
              rel="noopener noreferrer"
              className="p-1.5 text-gray-400 hover:text-purple-600 transition-colors"
              title="Open in ClickUp"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}

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
