import { useState, useEffect } from 'react'

interface Task {
  id: string
  name: string
  isRunning: boolean
  currentSessionTime: number
  lastSessionTime: number
  totalTime: number
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

  return (
    <div>
      <h1>Tasks Clock</h1>

      <div>
        <p>Total elapsed time: {totalElapsedTime} seconds</p>
        <button onClick={stopAll}>Stop All</button>
        <button onClick={resetAll}>Reset All</button>
      </div>

      <div>
        {tasks.map(task => (
          <div key={task.id}>
            <input
              type="text"
              value={task.name}
              onChange={(e) => updateTaskName(task.id, e.target.value)}
              placeholder="Task name"
            />
            <button onClick={() => startTask(task.id)}>
              {task.isRunning ? 'Running' : 'Start'}
            </button>
            {task.isRunning ? (
              <span>Current session: {task.currentSessionTime} seconds</span>
            ) : (
              <span>Last session: {task.lastSessionTime} seconds</span>
            )}
            <span>Total: {task.totalTime} seconds</span>
          </div>
        ))}
      </div>

      <AddTaskForm onAdd={addTask} />
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
      <input
        type="text"
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Add new task"
      />
      <button type="submit">Add Task</button>
    </form>
  )
}

export default App
