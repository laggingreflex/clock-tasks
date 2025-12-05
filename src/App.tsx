import { useState, useEffect } from 'react'
import './App.css'
import { GoogleOAuthProvider, useGoogleLogin } from '@react-oauth/google'
import { googleDriveService } from './services/googleDriveService'

interface TaskData {
  id: string
  name: string
  sessionStartTime?: number // Unix timestamp when task was started in current session
  lastSessionEndTime?: number // Unix timestamp when last session ended
  totalSessionMs: number // Total milliseconds accumulated across all sessions
}

interface StoredData {
  tasks: TaskData[]
  currentRunningTaskId?: string
  lastModified: number
}

interface Task {
  id: string
  name: string
  isRunning: boolean
  currentSessionTime: number
  lastSessionTime: number
  totalTime: number
}

interface User {
  id: string
  email: string
  name: string
  picture: string
  accessToken: string
}

// Helper to convert TaskData to display Task (with calculated values)
function taskDataToTask(taskData: TaskData, currentRunningTaskId: string | undefined, now: number): Task {
  const isRunning = taskData.id === currentRunningTaskId
  const currentSessionTime = isRunning && taskData.sessionStartTime
    ? Math.floor((now - taskData.sessionStartTime) / 1000)
    : 0
  const lastSessionTime = taskData.sessionStartTime && taskData.lastSessionEndTime && !isRunning
    ? Math.floor((taskData.lastSessionEndTime - taskData.sessionStartTime) / 1000)
    : 0
  const totalTime = Math.floor(taskData.totalSessionMs / 1000) + currentSessionTime

  return {
    id: taskData.id,
    name: taskData.name,
    isRunning,
    currentSessionTime,
    lastSessionTime,
    totalTime
  }
}

function formatTime(seconds: number): string {
  if (seconds < 60) {
    return `${seconds}s`
  }

  const minutes = seconds / 60
  if (minutes < 60) {
    return `${minutes.toFixed(1)}m`
  }

  const hours = minutes / 60
  if (hours < 24) {
    return `${hours.toFixed(1)}h`
  }

  const days = hours / 24
  if (days < 7) {
    return `${days.toFixed(1)}d`
  }

  const weeks = days / 7
  if (weeks < 4.3) {
    return `${weeks.toFixed(1)}w`
  }

  const months = days / 30.44
  if (months < 12) {
    return `${months.toFixed(1)}mo`
  }

  const years = days / 365.25
  return `${years.toFixed(1)}y`
}

function LoginComponent({ onLoginSuccess }: { onLoginSuccess: (user: User) => void }) {
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse: any) => {
      try {
        const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
          headers: {
            Authorization: `Bearer ${tokenResponse.access_token}`
          }
        })
        const userInfo = await userInfoResponse.json()

        const newUser: User = {
          id: userInfo.id,
          email: userInfo.email,
          name: userInfo.name,
          picture: userInfo.picture,
          accessToken: tokenResponse.access_token
        }
        onLoginSuccess(newUser)
      } catch (error) {
        console.error('Login failed:', error)
      }
    },
    scope: 'openid email profile https://www.googleapis.com/auth/drive.file'
  })

  return (
    <div className="login-container">
      <h1>Tasks Clock</h1>
      <p>Sign in with Google to sync your tasks</p>
      <button onClick={() => login()} style={{ padding: '10px 20px', fontSize: '16px' }}>
        Sign in with Google
      </button>
    </div>
  )
}

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('googleUser')
    return saved ? JSON.parse(saved) : null
  })
  const [driveFileId, setDriveFileId] = useState<string | null>(null)
  const [lastSyncTime, setLastSyncTime] = useState<number>(0)

  const [taskDataList, setTaskDataList] = useState<TaskData[]>(() => {
    const saved = localStorage.getItem('clockTasks')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        return data.tasks || []
      } catch {
        return []
      }
    }
    return []
  })
  const [currentRunningTaskId, setCurrentRunningTaskId] = useState<string | undefined>(() => {
    const saved = localStorage.getItem('clockTasks')
    if (saved) {
      try {
        const data = JSON.parse(saved)
        return data.currentRunningTaskId
      } catch {
        return undefined
      }
    }
    return undefined
  })

  const [deletionMode, setDeletionMode] = useState(false)
  const [lastAddedTaskId, setLastAddedTaskId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<'total' | 'alphabetical'>('total')
  const [now, setNow] = useState(Date.now())

  const getTasks = (): Task[] => {
    return taskDataList.map(td => taskDataToTask(td, currentRunningTaskId, now))
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
      setCurrentRunningTaskId(driveData.currentRunningTaskId)
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
          setCurrentRunningTaskId(driveData.currentRunningTaskId)
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
          currentRunningTaskId,
          lastModified: Date.now()
        }
        if (!dataToSync.lastModified) {
          dataToSync.lastModified = Date.now()
        }
        await googleDriveService.updateTasksFile(driveFileId, dataToSync)
        setLastSyncTime(dataToSync.lastModified)
        localStorage.setItem('clockTasks', JSON.stringify(dataToSync))
      }
    } catch (error) {
      console.error('Failed to sync to Google Drive:', error)
      localStorage.setItem('clockTasks', JSON.stringify({
        tasks: taskDataList,
        currentRunningTaskId,
        lastModified: Date.now()
      }))
    }
  }

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    document.title = `Tasks Clock: ${formatTime(getTotalElapsedTime())}`
  }, [getTotalElapsedTime()])

  useEffect(() => {
    if (lastAddedTaskId) {
      const element = document.getElementById(`task-${lastAddedTaskId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      setLastAddedTaskId(null)
    }
  }, [lastAddedTaskId])

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deletionMode && !(e.target as HTMLElement).closest('.delete-btn')) {
        setDeletionMode(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [deletionMode])

  const startTask = (id: string) => {
    const now = Date.now()
    setTaskDataList(prevList => {
      const updated = prevList.map(td => {
        if (td.id === id) {
          return { ...td, sessionStartTime: now }
        } else if (td.id === currentRunningTaskId) {
          const prevSessionDuration = now - (td.sessionStartTime || now)
          return {
            ...td,
            sessionStartTime: undefined,
            lastSessionEndTime: now,
            totalSessionMs: td.totalSessionMs + prevSessionDuration
          }
        }
        return td
      })
      setCurrentRunningTaskId(id)
      syncToGoogleDrive({
        tasks: updated,
        currentRunningTaskId: id,
        lastModified: now
      })
      return updated
    })
  }

  const stopAll = () => {
    if (!currentRunningTaskId) return
    const now = Date.now()
    setTaskDataList(prevList => {
      const updated = prevList.map(td => {
        if (td.id === currentRunningTaskId) {
          const sessionDuration = now - (td.sessionStartTime || now)
          return {
            ...td,
            sessionStartTime: undefined,
            lastSessionEndTime: now,
            totalSessionMs: td.totalSessionMs + sessionDuration
          }
        }
        return td
      })
      setCurrentRunningTaskId(undefined)
      syncToGoogleDrive({
        tasks: updated,
        currentRunningTaskId: undefined,
        lastModified: now
      })
      return updated
    })
  }

  const resetAll = () => {
    const now = Date.now()
    setTaskDataList(prevList => {
      const reset = prevList.map(td => ({
        ...td,
        sessionStartTime: undefined,
        lastSessionEndTime: undefined,
        totalSessionMs: 0
      }))
      setCurrentRunningTaskId(undefined)
      syncToGoogleDrive({
        tasks: reset,
        currentRunningTaskId: undefined,
        lastModified: now
      })
      return reset
    })
  }

  const addTask = (name: string) => {
    if (name.trim()) {
      const id = Date.now().toString()
      const now = Date.now()
      setTaskDataList(prevList => {
        const updated = prevList.map(td => {
          if (td.id === currentRunningTaskId) {
            const sessionDuration = now - (td.sessionStartTime || now)
            return {
              ...td,
              sessionStartTime: undefined,
              lastSessionEndTime: now,
              totalSessionMs: td.totalSessionMs + sessionDuration
            }
          }
          return td
        })
        const newTaskData: TaskData = {
          id,
          name: name.trim(),
          sessionStartTime: now,
          totalSessionMs: 0
        }
        const withNewTask = [...updated, newTaskData]
        setCurrentRunningTaskId(id)
        syncToGoogleDrive({
          tasks: withNewTask,
          currentRunningTaskId: id,
          lastModified: now
        })
        setLastAddedTaskId(id)
        return withNewTask
      })
    }
  }

  const updateTaskName = (id: string, name: string) => {
    const now = Date.now()
    setTaskDataList(prevList => {
      const updated = prevList.map(td => (td.id === id ? { ...td, name } : td))
      syncToGoogleDrive({
        tasks: updated,
        currentRunningTaskId,
        lastModified: now
      })
      return updated
    })
  }

  const deleteTask = (id: string) => {
    if (window.confirm('Delete this task?')) {
      const now = Date.now()
      setTaskDataList(prevList => {
        const updated = prevList.filter(td => td.id !== id)
        let newCurrentRunningTaskId = currentRunningTaskId
        if (currentRunningTaskId === id) {
          newCurrentRunningTaskId = undefined
        }
        setCurrentRunningTaskId(newCurrentRunningTaskId)
        syncToGoogleDrive({
          tasks: updated,
          currentRunningTaskId: newCurrentRunningTaskId,
          lastModified: now
        })
        return updated
      })
    }
  }

  const deleteAllTasks = () => {
    if (window.confirm('Delete all tasks?')) {
      const now = Date.now()
      setTaskDataList([])
      setCurrentRunningTaskId(undefined)
      setDeletionMode(false)
      syncToGoogleDrive({
        tasks: [],
        currentRunningTaskId: undefined,
        lastModified: now
      })
    }
  }

  const toggleDeletionMode = () => {
    setDeletionMode(!deletionMode)
  }

  const handleDeleteAllClick = () => {
    if (deletionMode) {
      deleteAllTasks()
    } else {
      toggleDeletionMode()
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

  return (
    <div>
      {!user ? (
        <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
          <LoginComponent onLoginSuccess={(newUser) => {
            setUser(newUser)
            localStorage.setItem('googleUser', JSON.stringify(newUser))
          }} />
        </GoogleOAuthProvider>
      ) : (
        <div>
          <div className="header">
            <div>
              <h1>Tasks Clock: {formatTime(getTotalElapsedTime())}</h1>
            </div>
            <div className="user-info">
              <img src={user.picture} alt={user.name} className="user-avatar" />
              <div>
                <p className="user-name">{user.name}</p>
                <p className="user-email">{user.email}</p>
              </div>
              <button className="logout-btn" onClick={() => {
                setUser(null)
                localStorage.removeItem('googleUser')
              }}>
                🚪 Logout
              </button>
            </div>
          </div>

          <AddTaskForm onAdd={addTask} />

          <div className="tasks-list">
            {getSortedTasks().map(task => {
              const totalTasksTime = getTasks().reduce((sum, t) => sum + t.totalTime, 0)
              const percentage = totalTasksTime > 0 ? ((task.totalTime / totalTasksTime) * 100).toFixed(1) : 0

              return (
                <div className={`task-item ${task.isRunning ? 'running' : ''}`} key={task.id} id={`task-${task.id}`}>
                  <div className="task-inputs">
                    <input
                      type="text"
                      value={task.name}
                      onChange={(e) => updateTaskName(task.id, e.target.value)}
                      onFocus={() => startTask(task.id)}
                      placeholder="Task name"
                    />
                    {deletionMode && (
                      <button title="Delete task" className="delete-btn" onClick={() => deleteTask(task.id)}>🗑</button>
                    )}
                  </div>
                  <div className="task-stats">
                    {task.isRunning ? (
                      <span>Current: {formatTime(task.currentSessionTime)}</span>
                    ) : (
                      <span>Last: {formatTime(task.lastSessionTime)}</span>
                    )}
                    <span>Total: {formatTime(task.totalTime)} ({percentage}%)</span>
                  </div>
                </div>
              )
            })}
          </div>

          <div className="controls">
            <div className="controls-buttons">
              <button title="Stop all tasks" onClick={stopAll}>⏹</button>
              <button title="Reset all tasks" onClick={resetAll}>🔄</button>
              <button
                title={sortMode === 'total' ? 'Sort: Total Time (descending)' : 'Sort: Alphabetical'}
                onClick={toggleSort}
              >
                {sortMode === 'total' ? '⏱' : '🔤'}
              </button>
              <button
                title={deletionMode ? "Delete all tasks" : "Enable deletion mode"}
                className={`delete-btn ${deletionMode ? 'deletion-active' : ''}`}
                onClick={handleDeleteAllClick}
              >
                🗑
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

interface AddTaskFormProps {
  onAdd: (name: string) => void
}

function AddTaskForm({ onAdd }: AddTaskFormProps) {
  const [input, setInput] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onAdd(input)
    setInput('')
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="form-inputs">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Add new task"
        />
        <button type="submit" title="Add new task">➕</button>
      </div>
    </form>
  )
}

export default App
