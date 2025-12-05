import { useState, useEffect } from 'react'
import './App.css'
import { GoogleOAuthProvider, GoogleLogin } from '@react-oauth/google'
import { jwtDecode } from 'jwt-decode'
import { googleDriveService } from './services/googleDriveService'

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

interface DecodedToken {
  sub: string
  email: string
  name: string
  picture: string
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

function App() {
  const [user, setUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('googleUser')
    return saved ? JSON.parse(saved) : null
  })
  const [driveFileId, setDriveFileId] = useState<string | null>(null)

  const [tasks, setTasks] = useState<Task[]>(() => {
    const saved = localStorage.getItem('clockTasks')
    if (saved) {
      const data = JSON.parse(saved)
      return data.tasks || []
    }
    return []
  })
  const [totalElapsedTime, setTotalElapsedTime] = useState(() => {
    const saved = localStorage.getItem('clockTasks')
    if (saved) {
      const data = JSON.parse(saved)
      return data.totalElapsedTime || 0
    }
    return 0
  })
  const [deletionMode, setDeletionMode] = useState(false)
  const [lastAddedTaskId, setLastAddedTaskId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<'total' | 'alphabetical'>('total')

  // Initialize Google Drive when user logs in
  useEffect(() => {
    if (user) {
      googleDriveService.setAccessToken(user.accessToken)
      initializeGoogleDrive()
    }
  }, [user])

  const initializeGoogleDrive = async () => {
    if (!user) return
    try {
      const folderId = await googleDriveService.findOrCreateAppFolder()

      const fileId = await googleDriveService.findOrCreateTasksFile(folderId)
      setDriveFileId(fileId)

      // Load tasks from Google Drive
      const driveData = await googleDriveService.loadTasks(fileId)
      setTasks(driveData.tasks || [])
      setTotalElapsedTime(driveData.totalElapsedTime || 0)
    } catch (error) {
      console.error('Failed to initialize Google Drive:', error)
    }
  }

  // Save to localStorage whenever state changes
  useEffect(() => {
    const data = { tasks, totalElapsedTime }
    localStorage.setItem('clockTasks', JSON.stringify(data))

    // Also sync to Google Drive if logged in
    if (user && driveFileId) {
      syncToGoogleDrive(data)
    }
  }, [tasks, totalElapsedTime, user, driveFileId])

  const syncToGoogleDrive = async (data: any) => {
    try {
      if (driveFileId) {
        await googleDriveService.updateTasksFile(driveFileId, data)
      }
    } catch (error) {
      console.error('Failed to sync to Google Drive:', error)
    }
  }

  // Update document title with total time
  useEffect(() => {
    document.title = `Tasks Clock: ${formatTime(totalElapsedTime)}`
  }, [totalElapsedTime])

  // Scroll to newly added task
  useEffect(() => {
    if (lastAddedTaskId) {
      const element = document.getElementById(`task-${lastAddedTaskId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      setLastAddedTaskId(null)
    }
  }, [lastAddedTaskId])

  // Handle clicking outside to exit deletion mode
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (deletionMode && !(e.target as HTMLElement).closest('.delete-btn')) {
        setDeletionMode(false)
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [deletionMode])

  // Timer interval - tick every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTasks(prevTasks => {
        const updated = prevTasks.map(task => {
          if (task.isRunning) {
            return {
              ...task,
              currentSessionTime: task.currentSessionTime + 1,
              totalTime: task.totalTime + 1
            }
          }
          return task
        })
        return updated
      })

      setTotalElapsedTime((prev: number) => {
        const hasRunningTask = tasks.some(t => t.isRunning)
        return hasRunningTask ? prev + 1 : prev
      })
    }, 1000)

    return () => clearInterval(interval)
  }, [tasks])

  const startTask = (id: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task => {
        if (task.id === id) {
          // Starting this task
          return {
            ...task,
            isRunning: true,
            currentSessionTime: 0
          }
        } else if (task.isRunning) {
          // This task was running, now stop it and save as last session
          return {
            ...task,
            isRunning: false,
            lastSessionTime: task.currentSessionTime,
            currentSessionTime: 0
          }
        }
        return task
      })
    )
  }

  const stopAll = () => {
    setTasks(prevTasks =>
      prevTasks.map(task => ({
        ...task,
        isRunning: false,
        lastSessionTime: task.currentSessionTime,
        currentSessionTime: 0
      }))
    )
  }

  const resetAll = () => {
    setTasks(prevTasks =>
      prevTasks.map(task => ({
        ...task,
        isRunning: false,
        currentSessionTime: 0,
        lastSessionTime: 0,
        totalTime: 0
      }))
    )
    setTotalElapsedTime(0)
  }

  const addTask = (name: string) => {
    if (name.trim()) {
      const newTask: Task = {
        id: Date.now().toString(),
        name: name.trim(),
        isRunning: true,
        currentSessionTime: 0,
        lastSessionTime: 0,
        totalTime: 0
      }
      setTasks(prev => {
        // Stop all other tasks, but only update state if they were running
        const updated = prev.map(task => {
          if (task.isRunning) {
            return {
              ...task,
              isRunning: false,
              lastSessionTime: task.currentSessionTime,
              currentSessionTime: 0
            }
          }
          return {
            ...task,
            isRunning: false
          }
        })
        return [...updated, newTask]
      })
      setLastAddedTaskId(newTask.id)
    }
  }

  const updateTaskName = (id: string, name: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task => (task.id === id ? { ...task, name } : task))
    )
  }

  const deleteTask = (id: string) => {
    if (window.confirm('Delete this task?')) {
      setTasks(prevTasks => prevTasks.filter(task => task.id !== id))
    }
  }

  const deleteAllTasks = () => {
    if (window.confirm('Delete all tasks?')) {
      setTasks([])
      setTotalElapsedTime(0)
      setDeletionMode(false)
    }
  }

  const toggleDeletionMode = () => {
    if (deletionMode) {
      // Exiting deletion mode
      setDeletionMode(false)
    } else {
      // Entering deletion mode
      setDeletionMode(true)
    }
  }

  const handleDeleteAllClick = () => {
    if (deletionMode) {
      deleteAllTasks()
    } else {
      toggleDeletionMode()
    }
  }

  const getSortedTasks = () => {
    const tasksCopy = [...tasks]
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
        <div className="login-container">
          <h1>Tasks Clock</h1>
          <p>Sign in with Google to sync your tasks</p>
          <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
            <GoogleLogin
              onSuccess={(credentialResponse) => {
                try {
                  const decoded = jwtDecode<DecodedToken>(credentialResponse.credential as string)
                  const newUser: User = {
                    id: decoded.sub,
                    email: decoded.email,
                    name: decoded.name,
                    picture: decoded.picture,
                    accessToken: credentialResponse.credential as string
                  }
                  setUser(newUser)
                  localStorage.setItem('googleUser', JSON.stringify(newUser))
                } catch (error) {
                  console.error('Login failed:', error)
                }
              }}
              onError={() => {
                console.log('Login Failed')
              }}
            />
          </GoogleOAuthProvider>
        </div>
      ) : (
        <div>
          <div className="header">
            <div>
              <h1>Tasks Clock: {formatTime(totalElapsedTime)}</h1>
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
              const totalTasksTime = tasks.reduce((sum, t) => sum + t.totalTime, 0)
              const percentage = totalTasksTime > 0 ? ((task.totalTime / totalTasksTime) * 100).toFixed(1) : 0

              return (
              <div className={`task-item ${task.isRunning ? 'running' : ''}`} key={task.id} id={`task-${task.id}`}>
                <div className="task-inputs">
                  <input
                    type="text"
                    value={task.name}
                    onChange={(e) => updateTaskName(task.id, e.target.value)}
                    onFocus={() => !task.isRunning && startTask(task.id)}
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
