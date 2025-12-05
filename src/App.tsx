import { useState, useEffect } from 'react'
import './App.css'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { googleDriveService } from './services/googleDriveService'
import { logger } from './utils/logger'
import { formatTime } from './utils/timeFormatter'
import { convertTaskDataList } from './utils/taskHelpers'
import { loadUserFromLocalStorage } from './utils/authHelpers'
import { loadFromLocalStorage, saveToLocalStorage } from './utils/storageHelpers'
import { useClickOutside, useDocumentTitle, useScrollToNewTask, useCurrentTime } from './hooks'
import { LoginComponent } from './components/LoginComponent'
import { AddTaskForm } from './components/AddTaskForm'
import { TaskList } from './components/TaskList'
import { UserHeader } from './components/UserHeader'
import { Controls } from './components/Controls'
import type { User, StoredData, TaskData, ClickEvent } from './types'

function App() {
  const [user, setUser] = useState<User | null>(loadUserFromLocalStorage)
  const [driveFileId, setDriveFileId] = useState<string | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<number>(0)

  const { tasks: initialTasks, clickHistory: initialClickHistory } = loadFromLocalStorage()
  const [taskDataList, setTaskDataList] = useState<TaskData[]>(initialTasks)
  const [clickHistory, setClickHistory] = useState<ClickEvent[]>(initialClickHistory)

  const [deletionMode, setDeletionMode] = useState(false)
  const [lastAddedTaskId, setLastAddedTaskId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<'total' | 'alphabetical'>('total')
  const [now, setNow] = useState(Date.now())
  const [showUserMenu, setShowUserMenu] = useState(false)

  const getTasks = () => {
    const tasks = convertTaskDataList(taskDataList, clickHistory, now)
    logger.debug('getTasks called:', { taskCount: tasks.length, clickHistoryLength: clickHistory.length, now })
    return tasks
  }

  const getTotalElapsedTime = (): number => {
    return getTasks().reduce((sum, t) => sum + t.totalTime, 0)
  }

  useEffect(() => {
    if (user) {
      googleDriveService.setAccessToken(user.accessToken)
      initializeGoogleDrive()
    }
  }, [user])

  const initializeGoogleDrive = async () => {
    if (!user) return
    try {
      googleDriveService.setAccessToken(user.accessToken)
      const folderId = await googleDriveService.findOrCreateAppFolder()
      const fileId = await googleDriveService.findOrCreateTasksFile(folderId)
      setDriveFileId(fileId)

      const driveData = await googleDriveService.loadTasks(fileId)
      setTaskDataList(driveData.tasks || [])
      setClickHistory(driveData.clickHistory || [])
      setLastSyncTime(driveData.lastModified || Date.now())
    } catch (error) {
      console.error('Failed to initialize Google Drive:', error)
    }
  }

  useEffect(() => {
    if (!user || !driveFileId) return

    const interval = setInterval(async () => {
      try {
        const driveData = await googleDriveService.loadTasks(driveFileId)
        if (driveData.lastModified && driveData.lastModified > lastSyncTime) {
          setTaskDataList(driveData.tasks || [])
          setClickHistory(driveData.clickHistory || [])
          setLastSyncTime(driveData.lastModified)
        }
      } catch (error) {
        console.error('Failed to check for remote changes:', error)
      }
    }, 10000)

    return () => clearInterval(interval)
  }, [user, driveFileId, lastSyncTime])

  const syncToGoogleDrive = async (updatedData?: StoredData) => {
    try {
      if (driveFileId && user) {
        const dataToSync = updatedData || {
          tasks: taskDataList,
          clickHistory,
          lastModified: Date.now()
        }
        if (!dataToSync.lastModified) {
          dataToSync.lastModified = Date.now()
        }
        logger.debug('Syncing to Google Drive:', { clickHistoryLength: dataToSync.clickHistory.length, taskCount: dataToSync.tasks.length })
        await googleDriveService.updateTasksFile(driveFileId, dataToSync)
        setLastSyncTime(dataToSync.lastModified)
        saveToLocalStorage(dataToSync)
        logger.debug('Local storage updated')
      }
    } catch (error) {
      logger.error('Failed to sync to Google Drive:', error)
      saveToLocalStorage({
        tasks: taskDataList,
        clickHistory,
        lastModified: Date.now()
      })
    }
  }

  useCurrentTime(setNow)
  useDocumentTitle(`Tasks Clock: ${formatTime(getTotalElapsedTime())}`)
  useScrollToNewTask(lastAddedTaskId, () => setLastAddedTaskId(null))
  useClickOutside(deletionMode, () => setDeletionMode(false), '.delete-btn')
  useClickOutside(showUserMenu, () => setShowUserMenu(false), '.user-avatar-container')

  const startTask = (id: string) => {
    const now = Date.now()
    logger.log(`Starting task: ${id} at ${now}`)
    logger.debug('Current clickHistory:', clickHistory)
    const newClickHistory = [...clickHistory, { taskId: id, timestamp: now }]
    logger.debug('New clickHistory:', newClickHistory)
    setClickHistory(newClickHistory)
    syncToGoogleDrive({
      tasks: taskDataList,
      clickHistory: newClickHistory,
      lastModified: now
    })
  }

  const stopAll = () => {
    // Stopping all is actually just... not clicking anything. The time will accumulate until next click.
    setNow(Date.now())
  }

  const resetAll = () => {
    const now = Date.now()
    setClickHistory([])
    syncToGoogleDrive({
      tasks: taskDataList,
      clickHistory: [],
      lastModified: now
    })
  }

  const addTask = (name: string) => {
    if (name.trim()) {
      const id = Date.now().toString()
      const now = Date.now()

      const newTaskData: TaskData = {
        id,
        name: name.trim()
      }
      const newTasks = [...taskDataList, newTaskData]
      const newClickHistory = [...clickHistory, { taskId: id, timestamp: now }]

      setTaskDataList(newTasks)
      setClickHistory(newClickHistory)
      syncToGoogleDrive({
        tasks: newTasks,
        clickHistory: newClickHistory,
        lastModified: now
      })
      setLastAddedTaskId(id)
    }
  }

  const updateTaskName = (id: string, name: string) => {
    const now = Date.now()
    const updated = taskDataList.map(td => (td.id === id ? { ...td, name } : td))
    syncToGoogleDrive({
      tasks: updated,
      clickHistory,
      lastModified: now
    })
    setTaskDataList(updated)
  }

  const deleteTask = (id: string) => {
    if (window.confirm('Delete this task?')) {
      const now = Date.now()
      const updated = taskDataList.filter(td => td.id !== id)
      const updatedHistory = clickHistory.filter(e => e.taskId !== id)
      setTaskDataList(updated)
      setClickHistory(updatedHistory)
      syncToGoogleDrive({
        tasks: updated,
        clickHistory: updatedHistory,
        lastModified: now
      })
    }
  }

  const deleteAllTasks = () => {
    if (window.confirm('Delete all tasks?')) {
      const now = Date.now()
      setTaskDataList([])
      setClickHistory([])
      setDeletionMode(false)
      syncToGoogleDrive({
        tasks: [],
        clickHistory: [],
        lastModified: now
      })
    }
  }

  const getSortedTasks = () => {
    const tasksCopy = [...getTasks()]
    if (sortMode === 'total') {
      return tasksCopy.sort((a, b) => b.totalTime - a.totalTime)
    } else if (sortMode === 'alphabetical') {
      return tasksCopy.sort((a, b) => a.name.localeCompare(b.name))
    }
    return tasksCopy
  }

  const toggleSort = () => {
    setSortMode(prev => prev === 'total' ? 'alphabetical' : 'total')
  }

  const handleLogout = () => {
    setUser(null)
    localStorage.removeItem('googleUser')
  }

  return (
    <div>
      {!user ? (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
          <LoginComponent
            onLoginSuccess={(newUser) => {
              setUser(newUser)
              localStorage.setItem('googleUser', JSON.stringify(newUser))
            }}
          />
        </GoogleOAuthProvider>
      ) : (
        <div>
          <UserHeader
            user={user}
            totalElapsedTime={getTotalElapsedTime()}
            showUserMenu={showUserMenu}
            onToggleMenu={() => setShowUserMenu(!showUserMenu)}
            onLogout={handleLogout}
          />

          <AddTaskForm onAdd={addTask} />

          <TaskList
            tasks={getSortedTasks()}
            deletionMode={deletionMode}
            totalTasksTime={getTotalElapsedTime()}
            onNameChange={updateTaskName}
            onFocus={startTask}
            onDelete={deleteTask}
          />

          <Controls
            sortMode={sortMode}
            deletionMode={deletionMode}
            onStopAll={stopAll}
            onResetAll={resetAll}
            onToggleSort={toggleSort}
            onToggleDeletion={() => setDeletionMode(!deletionMode)}
            onDeleteAll={deleteAllTasks}
          />
        </div>
      )}
    </div>
  )
}

export default App