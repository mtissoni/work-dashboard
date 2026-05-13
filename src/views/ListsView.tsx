import { useState } from 'react'
import type { TaskEnrichment } from '../types'
import { formatDate, isOverdue, isDueToday } from '../utils/date-helpers'

interface ListsViewProps {
  tasks: TaskEnrichment[]
  onMarkComplete: (task: TaskEnrichment) => void
  onSelectTask: (task: TaskEnrichment) => void
  onMoveTask: (task: TaskEnrichment, targetListId: string, targetListName: string) => Promise<void>
}

export function ListsView({ tasks, onMarkComplete, onSelectTask, onMoveTask }: ListsViewProps) {
  const lists = groupByList(tasks)
  const listEntries = Object.entries(lists)

  // Build a lookup: list_name → list_id (from any task in that list)
  const listIdByName = new Map<string, string>()
  for (const task of tasks) {
    if (task.list_name && task.list_id && !listIdByName.has(task.list_name)) {
      listIdByName.set(task.list_name, task.list_id)
    }
  }

  if (listEntries.length === 0) {
    return (
      <div className="max-w-xl mx-auto pt-12 text-center text-gray-400">
        <p className="text-lg">No tasks synced yet.</p>
        <p className="text-sm mt-2">Click "Sync All" in the sidebar to get started.</p>
      </div>
    )
  }

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 items-start">
      {listEntries.map(([listName, listTasks]) => {
        const tree = buildTree(listTasks)
        return (
          <div key={listName} className="flex-shrink-0 w-72 bg-white border border-gray-100 rounded-xl shadow-sm p-3">
            <div className="flex items-center justify-between mb-2.5 px-1">
              <h2 className="text-sm font-semibold text-gray-800">{listName}</h2>
              <span className="text-xs font-medium text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">{listTasks.length}</span>
            </div>
            <div className="divide-y divide-gray-50">
              {tree.map((node) => (
                <TaskItem
                  key={node.task.id}
                  node={node}
                  depth={0}
                  listIdByName={listIdByName}
                  currentListName={listName}
                  onMarkComplete={onMarkComplete}
                  onSelect={onSelectTask}
                  onMove={onMoveTask}
                />
              ))}
            </div>
            {listTasks.length === 0 && (
              <p className="text-sm text-gray-400 px-1 py-2">No tasks.</p>
            )}
          </div>
        )
      })}
    </div>
  )
}

interface TaskNode {
  task: TaskEnrichment
  children: TaskNode[]
}

function TaskItem({
  node,
  depth,
  listIdByName,
  currentListName,
  onMarkComplete,
  onSelect,
  onMove,
}: {
  node: TaskNode
  depth: number
  listIdByName: Map<string, string>
  currentListName: string
  onMarkComplete: (task: TaskEnrichment) => void
  onSelect: (task: TaskEnrichment) => void
  onMove: (task: TaskEnrichment, targetListId: string, targetListName: string) => Promise<void>
}) {
  const { task, children } = node
  const [showMoveMenu, setShowMoveMenu] = useState(false)
  const [moving, setMoving] = useState(false)
  const overdue = isOverdue(task.due_date)
  const today = isDueToday(task.due_date)

  const otherLists = [...listIdByName.entries()].filter(([name]) => name !== currentListName)

  const handleMove = async (targetListId: string, targetListName: string) => {
    setMoving(true)
    setShowMoveMenu(false)
    await onMove(task, targetListId, targetListName)
    setMoving(false)
  }

  return (
    <>
      <div
        className="flex items-start gap-3 py-2.5 px-2 hover:bg-gray-50/80 rounded-lg group transition-colors"
        style={{ paddingLeft: `${8 + depth * 24}px` }}
      >
        {/* Checkbox */}
        <button
          onClick={() => onMarkComplete(task)}
          className="mt-0.5 w-[18px] h-[18px] rounded-full border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer flex-shrink-0"
        />

        {/* Content */}
        <div className="flex-1 min-w-0 cursor-pointer" onClick={() => onSelect(task)}>
          <p className={`text-sm leading-snug ${moving ? 'text-gray-400' : 'text-gray-800'}`}>
            {task.title ?? 'Untitled'}
          </p>
          <div className="flex items-center gap-2 mt-0.5">
            {task.due_date && (
              <span className={`text-xs ${overdue ? 'text-red-500' : today ? 'text-blue-600' : 'text-gray-400'}`}>
                {overdue ? '! ' : ''}{formatDate(task.due_date)}
              </span>
            )}
            {task.notes && (
              <span className="text-xs text-gray-300">
                <svg className="w-3 h-3 inline" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
              </span>
            )}
          </div>
        </div>

        {/* Move button — visible on hover, only for root tasks and if there are other lists */}
        {depth === 0 && otherLists.length > 0 && (
          <div className="relative opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMoveMenu((v) => !v) }}
              className="p-1 text-gray-400 hover:text-gray-600 text-xs cursor-pointer rounded"
              title="Move to list"
            >
              →
            </button>
            {showMoveMenu && (
              <div className="absolute right-0 top-6 z-20 bg-white border border-gray-200 rounded-lg shadow-lg min-w-max py-1">
                <p className="px-3 py-1 text-xs text-gray-400 font-medium">Move to</p>
                {otherLists.map(([name, id]) => (
                  <button
                    key={id}
                    onClick={() => handleMove(id, name)}
                    className="w-full text-left px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 cursor-pointer"
                  >
                    {name}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {children.map((child) => (
        <TaskItem
          key={child.task.id}
          node={child}
          depth={depth + 1}
          listIdByName={listIdByName}
          currentListName={currentListName}
          onMarkComplete={onMarkComplete}
          onSelect={onSelect}
          onMove={onMove}
        />
      ))}
    </>
  )
}

function groupByList(tasks: TaskEnrichment[]): Record<string, TaskEnrichment[]> {
  const groups: Record<string, TaskEnrichment[]> = {}
  for (const task of tasks) {
    const name = task.list_name ?? 'Untitled List'
    if (!groups[name]) groups[name] = []
    groups[name].push(task)
  }
  return groups
}

function buildTree(tasks: TaskEnrichment[]): TaskNode[] {
  const byExternalId = new Map<string, TaskNode>()
  const roots: TaskNode[] = []

  const sorted = [...tasks].sort((a, b) =>
    (a.position ?? '').localeCompare(b.position ?? '')
  )

  for (const task of sorted) {
    byExternalId.set(task.external_id, { task, children: [] })
  }

  for (const task of sorted) {
    const node = byExternalId.get(task.external_id)!
    if (task.parent_external_id) {
      const parent = byExternalId.get(task.parent_external_id)
      if (parent) {
        parent.children.push(node)
        continue
      }
    }
    roots.push(node)
  }

  return roots
}
