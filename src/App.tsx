import { useState, useCallback } from 'react'
import { useAuth } from './hooks/useAuth'
import { useTasks } from './hooks/useTasks'
import { useSync } from './hooks/useSync'
import { useGmail } from './hooks/useGmail'
import { useEmailSync } from './hooks/useEmailSync'
import { useNews } from './hooks/useNews'
import { useNewsSync } from './hooks/useNewsSync'
import { useCalendar } from './hooks/useCalendar'
import { useRecurringTemplates } from './hooks/useRecurringTemplates'
import { useClickUp } from './hooks/useClickUp'
import { useClickUpSync } from './hooks/useClickUpSync'
import { useGeminiSettings } from './hooks/useGeminiSettings'
import { generateRecurringTasks, applyTemplateEnrichment } from './lib/recurring/generate-tasks'
import { markTaskComplete, updateTaskDueDate, deleteTask, createTask } from './lib/sync/google-tasks'
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
import { NewsView } from './views/NewsView'
import { CalendarView } from './views/CalendarView'
import { TemplatesView } from './views/TemplatesView'
import { ClickUpView } from './views/ClickUpView'
import type { ViewType, TaskEnrichment, TaskFilters, EmailCacheRow } from './types'
import type { CreateTaskData } from './components/EmailDetailPanel'

export default function App() {
  const { session, googleToken, loading: authLoading, userId, signIn, signOut, refreshGoogleToken } = useAuth()
  const [currentView, setCurrentView] = useState<ViewType>('dashboard')
  const [filters, setFilters] = useState<TaskFilters>({})
  const [selectedTask, setSelectedTask] = useState<TaskEnrichment | null>(null)
  const [selectedEmail, setSelectedEmail] = useState<EmailCacheRow | null>(null)
  const { sync: syncTasks, isSyncing: isSyncingTasks, lastSyncedAt: lastTaskSync } = useSync()
  const { sync: syncEmails, isSyncing: isSyncingEmails } = useEmailSync()
  const { sync: syncNews, isSyncing: isSyncingNews } = useNewsSync()
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
  const {
    items: newsItems,
    loading: newsLoading,
    fetchItems: fetchNews,
    markRead: markNewsRead,
    toggleStar: toggleNewsStar,
    todayVideo,
    todayArticle,
    unreadCount: newsUnreadCount,
  } = useNews(userId)
  const {
    todayEvents,
    upcomingEvents,
    nextEvent,
    loading: calendarLoading,
    fetchEvents: fetchCalendar,
  } = useCalendar(googleToken, refreshGoogleToken)
  const {
    templates,
    loading: templatesLoading,
    enabledCount: recurringEnabledCount,
    createTemplate,
    updateTemplate,
    toggleTemplate,
    deleteTemplate,
  } = useRecurringTemplates(userId)
  const {
    token: clickUpToken,
    tokenLoading: clickUpTokenLoading,
    discovering: clickUpDiscovering,
    discoveryError: clickUpDiscoveryError,
    saveToken: saveClickUpToken,
    removeToken: removeClickUpToken,
    tasks: clickUpTasks,
    tasksLoading: clickUpTasksLoading,
    state: clickUpStateRaw,
    selectList: selectClickUpList,
    refreshTasks: refreshClickUpTasks,
    createList: createClickUpList,
    createTask: createClickUpTask,
    updateTask: updateClickUpTask,
    removeTask: removeClickUpTask,
  } = useClickUp(userId)
  const clickUpState = clickUpStateRaw ?? { lists: [], folderId: null, selectedListId: null, selectedListName: null }
  const { sync: syncClickUp, isSyncing: isSyncingClickUp } = useClickUpSync()
  const { geminiApiKey, geminiInstructions, saveSettings: saveGeminiSettings } = useGeminiSettings(userId)

  const isSyncing = isSyncingTasks || isSyncingEmails || isSyncingNews || isSyncingClickUp
  const lastSyncedAt = lastTaskSync
  const clickUpSelectedListId = clickUpState?.selectedListId ?? null
  const clickUpSelectedListName = clickUpState?.selectedListName ?? null

  const handleSync = useCallback(async () => {
    if (!googleToken || !userId) return
    try {
      // Generate recurring tasks before syncing (so they appear in the sync)
      await generateRecurringTasks(googleToken, userId)
      const syncs: Promise<unknown>[] = [
        syncTasks(googleToken, userId).then(() => applyTemplateEnrichment(userId)).then(() => fetchTasks()),
        syncEmails(googleToken, userId).then(() => fetchEmails()),
        syncNews(userId).then(() => fetchNews()),
        fetchCalendar(),
      ]
      if (clickUpToken && clickUpSelectedListId) {
        syncs.push(syncClickUp(clickUpToken, userId, clickUpSelectedListId).then(() => refreshClickUpTasks()))
      }
      await Promise.all(syncs)
    } catch (err: any) {
      if (err?.message?.includes('401')) {
        const newToken = await refreshGoogleToken()
        await generateRecurringTasks(newToken, userId)
        const syncs: Promise<unknown>[] = [
          syncTasks(newToken, userId).then(() => applyTemplateEnrichment(userId)).then(() => fetchTasks()),
          syncEmails(newToken, userId).then(() => fetchEmails()),
          syncNews(userId).then(() => fetchNews()),
          fetchCalendar(),
        ]
        if (clickUpToken && clickUpSelectedListId) {
          syncs.push(syncClickUp(clickUpToken, userId, clickUpSelectedListId).then(() => refreshClickUpTasks()))
        }
        await Promise.all(syncs)
      }
    }
  }, [googleToken, userId, syncTasks, syncEmails, syncNews, fetchTasks, fetchEmails, fetchNews, fetchCalendar, refreshGoogleToken, clickUpToken, clickUpSelectedListId, syncClickUp, refreshClickUpTasks])

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

  const handleMoveTask = useCallback(
    async (task: TaskEnrichment, targetListId: string, _targetListName: string) => {
      if (!googleToken || !task.list_id) return
      try {
        await createTask(googleToken, targetListId, {
          title: task.title ?? '',
          notes: task.notes ?? undefined,
          due: task.due_date ?? undefined,
        })
        await deleteTask(googleToken, task.list_id, task.external_id)
        await fetchTasks()
      } catch (err: any) {
        if (err?.message?.includes('401')) {
          const newToken = await refreshGoogleToken()
          await createTask(newToken, targetListId, {
            title: task.title ?? '',
            notes: task.notes ?? undefined,
            due: task.due_date ?? undefined,
          })
          await deleteTask(newToken, task.list_id!, task.external_id)
          await fetchTasks()
        } else {
          console.error('Failed to move task:', err)
        }
      }
    },
    [googleToken, refreshGoogleToken, fetchTasks]
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
    async (_email: EmailCacheRow, data: CreateTaskData) => {
      if (!googleToken) return
      try {
        await createTask(googleToken, data.listId, {
          title: data.title,
          notes: data.notes || undefined,
          due: data.dueDate || undefined,
        })
        await fetchTasks()
      } catch (err: any) {
        if (err?.message?.includes('401')) {
          const newToken = await refreshGoogleToken()
          await createTask(newToken, data.listId, {
            title: data.title,
            notes: data.notes || undefined,
            due: data.dueDate || undefined,
          })
          await fetchTasks()
        } else {
          throw err
        }
      }
    },
    [googleToken, refreshGoogleToken, fetchTasks]
  )

  const listOptions = Array.from(
    new Map(tasks.filter((t) => t.list_id && t.list_name).map((t) => [t.list_id, { id: t.list_id!, name: t.list_name! }])).values()
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
            todayVideo={todayVideo}
            todayArticle={todayArticle}
            newsUnreadCount={newsUnreadCount}
            todayEvents={todayEvents}
            nextEvent={nextEvent}
            recurringTemplates={templates}
            recurringEnabledCount={recurringEnabledCount}
            clickUpTasks={clickUpTasks}
            clickUpConnected={!!clickUpToken}
            clickUpListName={clickUpSelectedListName}
            onNavigate={setCurrentView}
            onSync={handleSync}
            onMarkNewsRead={markNewsRead}
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
              geminiApiKey={geminiApiKey}
              geminiInstructions={geminiInstructions}
              onSelectEmail={setSelectedEmail}
              onArchive={handleArchiveEmail}
              onStar={handleStarEmail}
              onMarkRead={handleMarkReadEmail}
              onSaveGeminiSettings={saveGeminiSettings}
            />
          )
        )}

        {currentView === 'news' && (
          newsLoading ? (
            <div className="flex items-center justify-center h-64">
              <p className="text-gray-400">Loading news...</p>
            </div>
          ) : (
            <NewsView
              items={newsItems}
              onMarkRead={markNewsRead}
              onToggleStar={toggleNewsStar}
            />
          )
        )}

        {currentView === 'calendar' && (
          <CalendarView
            todayEvents={todayEvents}
            upcomingEvents={upcomingEvents}
            loading={calendarLoading}
            aiApiKey={geminiApiKey}
            aiInstructions={geminiInstructions}
          />
        )}

        {currentView === 'templates' && (
          <TemplatesView
            templates={templates}
            loading={templatesLoading}
            googleToken={googleToken}
            refreshGoogleToken={refreshGoogleToken}
            onCreate={createTemplate}
            onUpdate={updateTemplate}
            onToggle={toggleTemplate}
            onDelete={deleteTemplate}
          />
        )}

        {currentView === 'clickup' && (
          <ClickUpView
            token={clickUpToken}
            tokenLoading={clickUpTokenLoading}
            discovering={clickUpDiscovering}
            discoveryError={clickUpDiscoveryError}
            tasks={clickUpTasks}
            tasksLoading={clickUpTasksLoading}
            state={clickUpState}
            isSyncing={isSyncingClickUp}
            onSaveToken={saveClickUpToken}
            onRemoveToken={removeClickUpToken}
            onSelectList={selectClickUpList}
            onSyncList={async () => {
              if (clickUpToken && userId && clickUpSelectedListId) {
                await syncClickUp(clickUpToken, userId, clickUpSelectedListId)
                await refreshClickUpTasks()
              }
            }}
            onCreateList={createClickUpList}
            onCreate={createClickUpTask}
            onUpdate={updateClickUpTask}
            onDelete={removeClickUpTask}
          />
        )}

        {currentView !== 'dashboard' && currentView !== 'inbox' && currentView !== 'news' && currentView !== 'calendar' && currentView !== 'templates' && currentView !== 'clickup' && (
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
                  onMoveTask={handleMoveTask}
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
          geminiApiKey={geminiApiKey}
          geminiInstructions={geminiInstructions}
          listOptions={listOptions}
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
