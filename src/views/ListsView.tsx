import { useState } from 'react'
import type { TaskEnrichment } from '../types'
import { formatDate, isOverdue, isDueToday } from '../utils/date-helpers'

interface ListsViewProps {
  tasks: TaskEnrichment[]
  onMarkComplete: (task: TaskEnrichment) => void
  onSelectTask: (task: TaskEnrichment) => void
}

export function ListsView({ tasks, onMarkComplete, onSelectTask }: ListsViewProps) {
  const lists = groupByList(tasks)
  const listNames = Object.keys(lists)
  const [activeList, setActiveList] = useState<string>(listNames[0] ?? '')

  if (listNames.length === 0) {
    return (
      <div className="max-w-xl mx-auto pt-12 text-center text-gray-400">
        <p className="text-lg">No tasks synced yet.</p>
        <p className="text-sm mt-2">Click "Sync Google Tasks" in the sidebar to get started.</p>
      </div>
    )
  }

  const currentTasks = lists[activeList] ?? []
  const tree = buildTree(currentTasks)

  return (
    <div className="max-w-xl mx-auto">
      {/* List tabs */}
      <div className="flex gap-1 border-b border-gray-200 mb-1 overflow-x-auto">
        {listNames.map((name) => (
          <button
            key={name}
            onClick={() => setActiveList(name)}
            className={`px-4 py-2.5 text-sm font-medium whitespace-nowrap transition-colors cursor-pointer ${
              activeList === name
                ? 'text-blue-600 border-b-2 border-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {name}
            <span className="ml-1.5 text-xs text-gray-400">
              {lists[name].length}
            </span>
          </button>
        ))}
      </div>

      {/* Task list */}
      <div className="divide-y divide-gray-100">
        {tree.map((node) => (
          <TaskItem
            key={node.task.id}
            node={node}
            onMarkComplete={onMarkComplete}
            onSelect={onSelectTask}
            depth={0}
          />
        ))}
      </div>

      {currentTasks.length === 0 && (
        <div className="text-center py-12 text-gray-400">
          <p>No tasks in this list.</p>
        </div>
      )}
    </div>
  )
}

interface TaskNode {
  task: TaskEnrichment
  children: TaskNode[]
}

function TaskItem({
  node,
  onMarkComplete,
  onSelect,
  depth,
}: {
  node: TaskNode
  onMarkComplete: (task: TaskEnrichment) => void
  onSelect: (task: TaskEnrichment) => void
  depth: number
}) {
  const { task, children } = node
  const overdue = isOverdue(task.due_date)
  const today = isDueToday(task.due_date)

  return (
    <>
      <div
        className="flex items-start gap-3 py-2.5 px-2 hover:bg-gray-50 rounded-lg cursor-pointer group transition-colors"
        style={{ paddingLeft: `${8 + depth * 28}px` }}
        onClick={() => onSelect(task)}
      >
        {/* Checkbox */}
        <button
          onClick={(e) => {
            e.stopPropagation()
            onMarkComplete(task)
          }}
          className="mt-0.5 w-[18px] h-[18px] rounded-full border-2 border-gray-300 hover:border-blue-500 hover:bg-blue-50 transition-colors cursor-pointer flex-shrink-0"
        />

        {/* Content */}
        <div className="flex-1 min-w-0">
          <p className="text-sm text-gray-800 leading-snug">
            {task.title ?? 'Untitled'}
          </p>

          {/* Details row */}
          <div className="flex items-center gap-2 mt-0.5">
            {task.due_date && (
              <span
                className={`text-xs ${
                  overdue
                    ? 'text-red-500'
                    : today
                    ? 'text-blue-600'
                    : 'text-gray-400'
                }`}
              >
                {overdue ? '!' : ''} {formatDate(task.due_date)}
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
      </div>

      {/* Render subtasks */}
      {children.map((child) => (
        <TaskItem
          key={child.task.id}
          node={child}
          onMarkComplete={onMarkComplete}
          onSelect={onSelect}
          depth={depth + 1}
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

  // Sort by position
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
