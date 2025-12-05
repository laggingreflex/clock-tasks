import { useState, useEffect } from 'react'
import './App.css'

interface Task {
  id: string
  name: string
  isRunning: boolean
  currentSessionTime: number
  lastSessionTime: number
  totalTime: number
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

  // Save to localStorage whenever state changes
  useEffect(() => {
    localStorage.setItem('clockTasks', JSON.stringify({ tasks, totalElapsedTime }))
  }, [tasks, totalElapsedTime])

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
    }
  }

  const updateTaskName = (id: string, name: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task => (task.id === id ? { ...task, name } : task))
    )
  }

  const deleteTask = (id: string) => {
    setTasks(prevTasks => prevTasks.filter(task => task.id !== id))
  }

  const deleteAllTasks = () => {
    setTasks([])
    setTotalElapsedTime(0)
  }

  return (
    <div>
      <h1>Tasks Clock</h1>

      <AddTaskForm onAdd={addTask} />

      <div className="controls">
        <div className="controls-top">
          <p>Total: {formatTime(totalElapsedTime)}</p>
          <div className="controls-buttons">
            <button title="Stop all tasks" onClick={stopAll}>⏹</button>
            <button title="Reset all tasks" onClick={resetAll}>🔄</button>
            <button title="Delete all tasks" className="delete-btn" onClick={deleteAllTasks}>🗑🗑🗑</button>
          </div>
        </div>
      </div>

      <div className="tasks-list">
        {tasks.map(task => {
          const totalTasksTime = tasks.reduce((sum, t) => sum + t.totalTime, 0)
          const percentage = totalTasksTime > 0 ? ((task.totalTime / totalTasksTime) * 100).toFixed(1) : 0

          return (
          <div className="task-item" key={task.id}>
            <div className="task-inputs">
              <input
                type="text"
                value={task.name}
                onChange={(e) => updateTaskName(task.id, e.target.value)}
                placeholder="Task name"
              />
              <button title={task.isRunning ? "Stop task" : "Start task"} onClick={() => startTask(task.id)}>
                {task.isRunning ? '⏸' : '▶'}
              </button>
              <button title="Delete task" className="delete-btn" onClick={() => deleteTask(task.id)}>🗑</button>
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
