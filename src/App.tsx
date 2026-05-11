import { useState, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTasks } from './hooks/useTasks'
import { useSync } from './hooks/useSync'
import { useGmail } from './hooks/useGmail'
import { useEmailSync } from './hooks/useEmailSync'
import { markTaskComplete, updateTaskDueDate } from './lib/sync/google-tasks'
import { LoginPage } from './components/LoginPage'
import { Sidebar } from './components/Sidebar'
import { TaskDetailPanel } from './components/TaskDetailPanel'
import { EmailDetailPanel } from './components/EmailDetailPanel'
import { DashboardView } from './views/DashboardView'
import { InboxView } from './views/InboxView'
import { TodayView } from './views/TodayView'
import { AllTasksView } from './views/AllTasksView'
import { OverdueView } from './views/OverdueView'
import { ByCategoryView } from './views/ByCategoryView'
import { ListsView } from './views/ListsView'
import type { ViewType, TaskEnrichment, TaskFilters, EmailCacheRow } from './types'

export default function App() {
  const { session, googleToken, loading: authLoading, userId, signIn, signOut, refreshGoogleToken } = useAuth()
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [filters, setFilters] = useState<TaskFilters>({})
  const [selectedTask, setSelectedTask] = useState<TaskEnrichment | null>(null)
  const [selectedEmail, setSelectedEmail] = useState<EmailCacheRow | null>(null)
  const { sync: syncTasks, isSyncing: isSyncingTasks, lastSyncedAt: lastTaskSync } = useSync()
  const { sync: syncEmails, isSyncing: isSyncingEmails } = useEmailSync()
  const { tasks, loading: tasksLoading, fetchTasks, updateEnrichment, removeTask, sourceListOptions } = useTasks(
    userId,
    currentView === 'all' ? filters : undefined
  )
  const {
    emails,
    actionableEmails,
    loading: emailsLoading,
    fetchEmails,
    doArchive,
    doMarkRead,
    doStar,
  } = useGmail(userId)

  const isSyncing = isSyncingTasks || isSyncingEmails
  const lastSyncedAt = lastTaskSync

  const handleSync = useCallback(async () => {
    if (!googleToken || !userId) return
    try {
      await Promise.all([
        syncTasks(googleToken, userId).then(() => fetchTasks()),
        syncEmails(googleToken, userId).then(() => fetchEmails()),
      ])
    } catch (err: any) {
      if (err?.message?.includes('401')) {
        const newToken = await refreshGoogleToken()
        await Promise.all([
          syncTasks(newToken, userId).then(() => fetchTasks()),
          syncEmails(newToken, userId).then(() => fetchEmails()),
        ])
      }
    }
  }, [googleToken, userId, syncTasks, syncEmails, fetchTasks, fetchEmails, refreshGoogleToken])

  const handleMarkComplete = useCallback(
    async (task: TaskEnrichment) => {
      if (!googleToken || !task.list_id) return
      try {
        await markTaskComplete(googleToken, task.list_id, task.external_id)
        removeTask(task.id)
        if (selectedTask?.id === task.id) setSelectedTask(null)
      } catch (err: any) {
        if (err?.message?.includes('401')) {
          const newToken = await refreshGoogleToken()
          await markTaskComplete(newToken, task.list_id!, task.external_id)
          removeTask(task.id)
          if (selectedTask?.id === task.id) setSelectedTask(null)
        } else {
          console.error('Failed to mark complete:', err)
        }
      }
    },
    [googleToken, refreshGoogleToken, removeTask, selectedTask]
  )

  const handleChangeDueDate = useCallback(
    async (task: TaskEnrichment, newDate: string) => {
      if (!googleToken || !task.list_id) return
      try {
        await updateTaskDueDate(googleToken, task.list_id, task.external_id, newDate)
        await fetchTasks()
      } catch (err: any) {
        if (err?.message?.includes('401')) {
          const newToken = await refreshGoogleToken()
          await updateTaskDueDate(newToken, task.list_id!, task.external_id, newDate)
          await fetchTasks()
        } else {
          console.error('Failed to update due date:', err)
        }
      }
    },
    [googleToken, refreshGoogleToken, fetchTasks]
  )

  const handleArchiveEmail = useCallback(
    async (email: EmailCacheRow) => {
      if (!googleToken) return
      try {
        await doArchive(googleToken, email)
        if (selectedEmail?.id === email.id) setSelectedEmail(null)
      } catch (err: any) {
        if (err?.message?.includes('401')) {
          const newToken = await refreshGoogleToken()
          await doArchive(newToken, email)
          if (selectedEmail?.id === email.id) setSelectedEmail(null)
        }
      }
    },
    [googleToken, doArchive, refreshGoogleToken, selectedEmail]
  )

  const handleStarEmail = useCallback(
    async (email: EmailCacheRow) => {
      if (!googleToken) return
      try {
        await doStar(googleToken, email)
      } catch (err: any) {
        if (err?.message?.includes('401')) {
          const newToken = await refreshGoogleToken()
          await doStar(newToken, email)
        }
      }
    },
    [googleToken, doStar, refreshGoogleToken]
  )

  const handleMarkReadEmail = useCallback(
    async (email: EmailCacheRow) => {
      if (!googleToken) return
      try {
        await doMarkRead(googleToken, email)
      } catch (err: any) {
        if (err?.message?.includes('401')) {
          const newToken = await refreshGoogleToken()
          await doMarkRead(newToken, email)
        }
      }
    },
    [googleToken, doMarkRead, refreshGoogleToken]
  )

  const handleCreateTaskFromEmail = useCallback(
    async (_email: EmailCacheRow) => {
      // TODO: Create a Google Task from email subject, then link via linked_task_id
      alert('Create task from email — coming soon')
    },
    []
  )

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-400">Loading...</p>
      </div>
    )
  }

  if (!session) {
    return <LoginPage onSignIn={signIn} />
  }

  const viewProps = {
    tasks,
    onUpdate: updateEnrichment,
    onMarkComplete: handleMarkComplete,
    onChangeDueDate: handleChangeDueDate,
    onSelectTask: setSelectedTask,
  }

  return (
    <div className="flex min-h-screen bg-white">
      <Sidebar
        currentView={currentView}
        onNavigate={(view) => {
          setCurrentView(view)
          setFilters({})
        }}
        onSync={handleSync}
        onSignOut={signOut}
        isSyncing={isSyncing}
        lastSyncedAt={lastSyncedAt}
      />

      <main className="flex-1 p-6 overflow-auto">
        {currentView === 'dashboard' && (
          <DashboardView
            tasks={tasks}
            actionableEmails={actionableEmails}
            totalEmailCount={emails.length}
            onNavigate={setCurrentView}
            onSync={handleSync}
            isSyncing={isSyncing}
          />
        )}

        {currentView === 'inbox' && (
          emailsLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-400">Loading emails...</p>
            </div>
          ) : (
            <InboxView
              emails={emails}
              onSelectEmail={setSelectedEmail}
              onArchive={handleArchiveEmail}
              onStar={handleStarEmail}
              onMarkRead={handleMarkReadEmail}
            />
          )
        )}

        {currentView !== 'dashboard' && currentView !== 'inbox' && (
          tasksLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-400">Loading tasks...</p>
            </div>
          ) : (
            <>
              {currentView === 'lists' && (
                <ListsView
                  tasks={tasks}
                  onMarkComplete={handleMarkComplete}
                  onSelectTask={setSelectedTask}
                />
              )}
              {currentView === 'today' && <TodayView {...viewProps} />}
              {currentView === 'all' && (
                <AllTasksView
                  {...viewProps}
                  sourceListOptions={sourceListOptions}
                  filters={filters}
                  onFiltersChange={setFilters}
                />
              )}
              {currentView === 'overdue' && <OverdueView {...viewProps} />}
              {currentView === 'category' && <ByCategoryView {...viewProps} />}
            </>
          )
        )}
      </main>

      {selectedTask && (
        <TaskDetailPanel
          task={selectedTask}
          onClose={() => setSelectedTask(null)}
          onUpdate={async (id, updates) => {
            const ok = await updateEnrichment(id, updates)
            if (ok) {
              setSelectedTask((prev) => (prev ? { ...prev, ...updates } : null))
            }
            return ok
          }}
          onMarkComplete={handleMarkComplete}
        />
      )}

      {selectedEmail && googleToken && (
        <EmailDetailPanel
          email={selectedEmail}
          googleToken={googleToken}
          onClose={() => setSelectedEmail(null)}
          onArchive={handleArchiveEmail}
          onStar={handleStarEmail}
          onMarkRead={handleMarkReadEmail}
          onCreateTask={handleCreateTaskFromEmail}
        />
      )}
    </div>
  )
}
