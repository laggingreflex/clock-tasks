# Quick Start Guides

## React (Hook-based)

```typescript
// useTaskManager.ts
import { useState, useEffect } from 'react'
import {
  TaskOperations,
  TaskQueries,
  LocalStorageBackend,
  type TaskManagerState,
  type Task
} from '@/core'

const storage = new LocalStorageBackend()

export function useTaskManager() {
  const [state, setState] = useState<TaskManagerState>({
    tasks: [],
    clickHistory: [],
    lastModified: Date.now()
  })
  const [now, setNow] = useState(Date.now())

  // Load on mount
  useEffect(() => {
    storage.load().then(setState)
  }, [])

  // Update time every second
  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const updateState = (newState: TaskManagerState) => {
    setState(newState)
    storage.save(newState)
  }

  return {
    state,
    now,
    tasks: TaskQueries.getAllTasks(state, now),
    
    // Operations
    addTask: (name: string) => {
      const newState = TaskOperations.addAndStartTask(name, state)
      updateState(newState)
    },
    startTask: (id: string) => {
      const newState = TaskOperations.startTask(id, state)
      updateState(newState)
    },
    updateTaskName: (id: string, name: string) => {
      const newState = TaskOperations.updateTaskName(id, name, state)
      updateState(newState)
    },
    deleteTask: (id: string) => {
      const newState = TaskOperations.deleteTask(id, state)
      updateState(newState)
    },
    deleteAllTasks: () => {
      const newState = TaskOperations.deleteAllTasks(state)
      updateState(newState)
    },
    resetTasks: () => {
      const newState = TaskOperations.resetAllTasks(state)
      updateState(newState)
    }
  }
}

// Usage in component
function TaskList() {
  const { tasks, addTask, startTask, deleteTask } = useTaskManager()

  return (
    <div>
      <input 
        onKeyPress={(e) => {
          if (e.key === 'Enter') addTask(e.currentTarget.value)
        }} 
      />
      {tasks.map(task => (
        <div key={task.id} onClick={() => startTask(task.id)}>
          {task.name} - {task.totalTime}s
          <button onClick={() => deleteTask(task.id)}>×</button>
        </div>
      ))}
    </div>
  )
}
```

## CLI / Node.js

```typescript
// cli.ts
import * as readline from 'readline'
import {
  TaskOperations,
  TaskQueries,
  LocalStorageBackend,
  formatTime,
  type TaskManagerState
} from '@/core'

const storage = new LocalStorageBackend()
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

async function main() {
  let state: TaskManagerState = {
    tasks: [],
    clickHistory: [],
    lastModified: Date.now()
  }

  // Load existing data
  const loaded = await storage.load()
  state = loaded as TaskManagerState

  const prompt = () => {
    rl.question('> ', async (input) => {
      const [cmd, ...args] = input.trim().split(' ')

      switch (cmd) {
        case 'add':
          state = TaskOperations.addAndStartTask(args.join(' '), state)
          await storage.save(state)
          console.log('✓ Task added')
          break

        case 'start':
          state = TaskOperations.startTask(args[0], state)
          await storage.save(state)
          console.log('✓ Task started')
          break

        case 'list':
          const tasks = TaskQueries.getAllTasks(state, Date.now())
          tasks.forEach(t => {
            const running = t.isRunning ? ' [RUNNING]' : ''
            console.log(`  ${t.name}: ${formatTime(t.totalTime)}${running}`)
          })
          break

        case 'delete':
          state = TaskOperations.deleteTask(args[0], state)
          await storage.save(state)
          console.log('✓ Task deleted')
          break

        case 'quit':
          rl.close()
          return
      }

      prompt()
    })
  }

  prompt()
}

main()
```

## Vue 3

```typescript
// composables/useTasks.ts
import { ref, computed } from 'vue'
import {
  TaskOperations,
  TaskQueries,
  LocalStorageBackend,
  type TaskManagerState
} from '@/core'

const storage = new LocalStorageBackend()

export function useTasks() {
  const state = ref<TaskManagerState>({
    tasks: [],
    clickHistory: [],
    lastModified: Date.now()
  })
  const now = ref(Date.now())

  // Load on mount
  const load = async () => {
    const data = await storage.load()
    state.value = data as TaskManagerState
  }

  // Computed properties
  const tasks = computed(() =>
    TaskQueries.getAllTasks(state.value, now.value)
  )

  const totalTime = computed(() =>
    TaskQueries.getTotalElapsedTime(state.value, now.value)
  )

  // Methods
  const updateState = async (newState: TaskManagerState) => {
    state.value = newState
    await storage.save(newState)
  }

  return {
    state,
    tasks,
    totalTime,
    load,
    addTask: (name: string) =>
      updateState(TaskOperations.addAndStartTask(name, state.value)),
    startTask: (id: string) =>
      updateState(TaskOperations.startTask(id, state.value)),
    deleteTask: (id: string) =>
      updateState(TaskOperations.deleteTask(id, state.value))
  }
}

// Component.vue
<script setup lang="ts">
import { onMounted, onUnmounted } from 'vue'
import { useTasks } from '@/composables/useTasks'

const { tasks, load, addTask, startTask, deleteTask } = useTasks()

onMounted(() => {
  load()
  const interval = setInterval(() => new Date(), 1000)
  onUnmounted(() => clearInterval(interval))
})
</script>

<template>
  <div>
    <input @keydown.enter="addTask($event.target.value)" />
    <div v-for="task in tasks" :key="task.id" @click="startTask(task.id)">
      {{ task.name }} - {{ task.totalTime }}s
      <button @click="deleteTask(task.id)">×</button>
    </div>
  </div>
</template>
```

## Svelte

```typescript
// stores.ts
import { writable } from 'svelte/store'
import {
  TaskOperations,
  TaskQueries,
  LocalStorageBackend,
  type TaskManagerState
} from '@/core'

const storage = new LocalStorageBackend()
const initialState: TaskManagerState = {
  tasks: [],
  clickHistory: [],
  lastModified: Date.now()
}

export const state = writable(initialState)
export const now = writable(Date.now())

export const taskManager = {
  async init() {
    const data = await storage.load()
    state.set(data as TaskManagerState)
  },
  
  addTask(name: string) {
    state.update(s => {
      const newState = TaskOperations.addAndStartTask(name, s)
      storage.save(newState)
      return newState
    })
  },
  
  startTask(id: string) {
    state.update(s => {
      const newState = TaskOperations.startTask(id, s)
      storage.save(newState)
      return newState
    })
  },
  
  deleteTask(id: string) {
    state.update(s => {
      const newState = TaskOperations.deleteTask(id, s)
      storage.save(newState)
      return newState
    })
  }
}

// App.svelte
<script>
  import { onMount, onDestroy } from 'svelte'
  import { state, now, taskManager } from './stores'
  import { TaskQueries, formatTime } from '@/core'

  let tasks = []

  onMount(async () => {
    await taskManager.init()
    
    const interval = setInterval(() => {
      now.set(Date.now())
    }, 1000)

    const unsubscribe = state.subscribe(s => {
      tasks = TaskQueries.getAllTasks(s, Date.now())
    })

    onDestroy(() => {
      clearInterval(interval)
      unsubscribe()
    })
  })

  let taskName = ''
</script>

<input bind:value={taskName} on:keydown={(e) => {
  if (e.key === 'Enter') {
    taskManager.addTask(taskName)
    taskName = ''
  }
}} />

{#each tasks as task (task.id)}
  <div on:click={() => taskManager.startTask(task.id)}>
    {task.name} - {formatTime(task.totalTime)}
    <button on:click={() => taskManager.deleteTask(task.id)}>×</button>
  </div>
{/each}
```

## React Native

```typescript
// hooks/useTaskManager.ts
import { useState, useEffect } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import {
  TaskOperations,
  TaskQueries,
  type TaskManagerState
} from '@/core'

export function useTaskManager() {
  const [state, setState] = useState<TaskManagerState>({
    tasks: [],
    clickHistory: [],
    lastModified: Date.now()
  })
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    // Load from AsyncStorage
    AsyncStorage.getItem('taskState').then(data => {
      if (data) setState(JSON.parse(data))
    })
  }, [])

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(interval)
  }, [])

  const updateState = async (newState: TaskManagerState) => {
    setState(newState)
    await AsyncStorage.setItem('taskState', JSON.stringify(newState))
  }

  return {
    tasks: TaskQueries.getAllTasks(state, now),
    addTask: (name: string) => {
      const newState = TaskOperations.addAndStartTask(name, state)
      updateState(newState)
    },
    startTask: (id: string) => {
      const newState = TaskOperations.startTask(id, state)
      updateState(newState)
    }
  }
}

// App.tsx
import { View, Text, TouchableOpacity, FlatList } from 'react-native'
import { useTaskManager } from './hooks/useTaskManager'
import { formatTime } from '@/core'

export default function App() {
  const { tasks, addTask, startTask } = useTaskManager()

  return (
    <View>
      <FlatList
        data={tasks}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity onPress={() => startTask(item.id)}>
            <Text>{item.name} - {formatTime(item.totalTime)}</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  )
}
```

## Electron (Desktop)

```typescript
// main.ts
import { app, BrowserWindow } from 'electron'
import {
  TaskOperations,
  TaskQueries,
  LocalStorageBackend,
  type TaskManagerState
} from '@/core'

const storage = new LocalStorageBackend()
let mainWindow: BrowserWindow | null = null
let state: TaskManagerState = {
  tasks: [],
  clickHistory: [],
  lastModified: Date.now()
}

// IPC handlers
ipcMain.handle('tasks:add', async (event, name: string) => {
  state = TaskOperations.addAndStartTask(name, state)
  await storage.save(state)
  return TaskQueries.getAllTasks(state, Date.now())
})

ipcMain.handle('tasks:list', async () => {
  const loaded = await storage.load()
  state = loaded as TaskManagerState
  return TaskQueries.getAllTasks(state, Date.now())
})

// renderer/App.tsx
import { ipcRenderer } from 'electron'
import { useState, useEffect } from 'react'

function App() {
  const [tasks, setTasks] = useState([])

  useEffect(() => {
    ipcRenderer.invoke('tasks:list').then(setTasks)
  }, [])

  const addTask = async (name: string) => {
    const updated = await ipcRenderer.invoke('tasks:add', name)
    setTasks(updated)
  }

  return (
    <div>
      <input onKeyPress={(e) => {
        if (e.key === 'Enter') addTask(e.currentTarget.value)
      }} />
      {tasks.map(t => <div key={t.id}>{t.name}</div>)}
    </div>
  )
}
```

## Backend API

```typescript
// Express example
import express from 'express'
import {
  TaskOperations,
  TaskQueries,
  LocalStorageBackend,
  type TaskManagerState
} from '@/core'

const app = express()
const storage = new LocalStorageBackend()

app.post('/tasks', async (req, res) => {
  const state = await storage.load() as TaskManagerState
  const newState = TaskOperations.addAndStartTask(req.body.name, state)
  await storage.save(newState)
  res.json(TaskQueries.getAllTasks(newState, Date.now()))
})

app.get('/tasks', async (req, res) => {
  const state = await storage.load() as TaskManagerState
  res.json(TaskQueries.getAllTasks(state, Date.now()))
})

app.post('/tasks/:id/start', async (req, res) => {
  let state = await storage.load() as TaskManagerState
  state = TaskOperations.startTask(req.params.id, state)
  await storage.save(state)
  res.json(TaskQueries.getAllTasks(state, Date.now()))
})
```

## Key Points

All these examples use **the exact same core logic**:
- Same `TaskOperations` for modifying state
- Same `TaskQueries` for reading state
- Same `TaskManagerState` structure
- Same business rules

Only the **UI framework** and **persistence** change!

This is the power of extracting your business logic.
