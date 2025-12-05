# Core Business Logic Module

This is a **framework-agnostic, reusable business logic layer** for task tracking. Extract all the business logic so you can create any UI on top of it (React, Vue, Svelte, CLI, mobile app, etc.).

## Architecture

The core module is completely separated from UI concerns and organized as follows:

```
src/core/
├── types.ts           # Data structures (TaskData, ClickEvent, Task, etc.)
├── calculations.ts    # Pure functions for computing statistics
├── storage.ts         # Persistence layer (localStorage, API, IndexedDB, etc.)
├── taskManager.ts     # State operations (TaskOperations) and queries (TaskQueries)
├── timeFormatter.ts   # Time formatting utilities
└── index.ts           # Public API exports
```

## Core Concepts

### 1. Immutable State Management

All operations return **new state objects** instead of mutating:

```typescript
const state = { tasks: [...], history: [...], lastModified: 0 }
const newState = TaskOperations.addAndStartTask('My Task', state)
// state is unchanged, newState is new
```

### 2. Pure Functions

All calculations are **pure** - no side effects, no external dependencies:

```typescript
// Always returns the same output for the same input
const stats = calculateTaskStats(taskId, history, now)
```

### 3. Pluggable Storage

Multiple storage backends supported:

```typescript
// Use localStorage
const storage = new LocalStorageBackend()

// Or use in-memory (for testing)
const storage = new InMemoryBackend()

// Or implement your own
class CustomBackend implements StorageBackend {
  async load() { /* ... */ }
  async save(data) { /* ... */ }
  async clear() { /* ... */ }
}
```

## Usage Examples

### Basic Setup

```typescript
import {
  TaskOperations,
  TaskQueries,
  LocalStorageBackend,
  formatTime
} from '@/core'

// Initialize state
const state = {
  tasks: [],
  history: [],
  lastModified: Date.now()
}

// Storage
const storage = new LocalStorageBackend()
```

### Task Operations

```typescript
// Add and start a task
let state = TaskOperations.addAndStartTask('Buy groceries', state)

// Add a task (without starting)
state = TaskOperations.addTask('Workout', state)

// Start/click a task
state = TaskOperations.startTask('task-id-123', state)

// Update task name
state = TaskOperations.updateTaskName('task-id-123', 'New name', state)

// Delete single task
state = TaskOperations.deleteTask('task-id-123', state)

// Delete all tasks
state = TaskOperations.deleteAllTasks(state)

// Reset timers
state = TaskOperations.resetAllTasks(state)

// Pause current task
state = TaskOperations.pauseCurrentTask(state)
```

### Queries

```typescript
const now = Date.now()

// Get all tasks with computed runtime
const tasks = TaskQueries.getAllTasks(state, now)
// Returns: Task[] with isRunning, currentSessionTime, totalTime, etc.

// Get specific task
const task = TaskQueries.getTask('task-id-123', state, now)

// Get currently running task ID
const currentId = TaskQueries.getCurrentRunningTaskId(state)

// Get total time across all tasks
const totalTime = TaskQueries.getTotalElapsedTime(state, now)

// Check if task exists
const exists = TaskQueries.taskExists('task-id-123', state)
```

### Persistence

```typescript
// Save state
await storage.save({
  tasks: state.tasks,
  history: state.history,
  lastModified: state.lastModified
})

// Load state
const data = await storage.load()
console.log(data.tasks, data.history)

// Clear storage
await storage.clear()
```

### Time Formatting

```typescript
import { formatTime } from '@/core'

formatTime(45)      // "45s"
formatTime(120)     // "2.0m"
formatTime(3600)    // "1.0h"
formatTime(86400)   // "1.0d"
formatTime(604800)  // "1.0w"
```

## Data Types

### TaskData
```typescript
interface TaskData {
  id: string      // Unique identifier (timestamp-based)
  name: string    // Task name
}
```

### ClickEvent
```typescript
interface ClickEvent {
  taskId: string   // Which task was clicked
  timestamp: number // Unix timestamp in milliseconds
}
```

### Task (Computed)
```typescript
interface Task {
  id: string                // From TaskData
  name: string              // From TaskData
  isRunning: boolean        // Is this the currently active task?
  currentSessionTime: number // Time since last click (in seconds)
  lastSessionTime: number    // Time from previous session (in seconds)
  totalTime: number         // Total accumulated time (in seconds)
}
```

### StoredData
```typescript
interface StoredData {
  tasks: TaskData[]           // All tasks
  history: ClickEvent[]  // Chronological click history
  lastModified: number        // Last modification timestamp
}
```

## How It Works

### Time Tracking

The system uses a **click history** to track time:

1. When you click/start a task, a `ClickEvent` is recorded with the current timestamp
2. Time for that task is calculated as: **timestamp of next click - timestamp of this click**
3. The most recent click determines the currently running task
4. All previous sessions' durations are summed for total time

**Example:**
```
Task A clicked at 10:00 → Task A is running
Task B clicked at 10:05 → Task A ran for 5 minutes, now Task B is running
Task A clicked at 10:10 → Task B ran for 5 minutes
Task A clicked at 10:15 → Task A ran for 5 minutes again

Task A total time: 5 + 5 = 10 minutes
Task B total time: 5 minutes
```

### State Updates

All operations follow this pattern:
```typescript
// Input: current state + operation parameters
// Process: compute new state
// Output: new state object (immutable)

TaskOperations.startTask(taskId, currentState)
  → returns new state with updated history
```

## React Integration Example

```typescript
import { useState, useEffect } from 'react'
import { TaskOperations, TaskQueries, LocalStorageBackend } from '@/core'

function TaskApp() {
  const [state, setState] = useState({ tasks: [], history: [], lastModified: 0 })
  const [now, setNow] = useState(Date.now())
  const storage = new LocalStorageBackend()

  // Load state on mount
  useEffect(() => {
    storage.load().then(setState)
  }, [])

  // Update time
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(timer)
  }, [])

  const addTask = (name) => {
    const newState = TaskOperations.addAndStartTask(name, state)
    setState(newState)
    storage.save({
      tasks: newState.tasks,
      history: newState.history,
      lastModified: newState.lastModified
    })
  }

  const tasks = TaskQueries.getAllTasks(state, now)

  return (
    <div>
      <input type="text" onKeyPress={(e) => {
        if (e.key === 'Enter') addTask(e.target.value)
      }} />
      {tasks.map(task => (
        <div key={task.id}>
          {task.name} - {task.totalTime}s
        </div>
      ))}
    </div>
  )
}
```

## CLI Example

```typescript
import { TaskOperations, TaskQueries, LocalStorageBackend, formatTime } from '@/core'

async function main() {
  const storage = new LocalStorageBackend()
  const data = await storage.load()

  let state = {
    tasks: data.tasks,
    history: data.history,
    lastModified: data.lastModified
  }

  // CLI loop
  const tasks = TaskQueries.getAllTasks(state, Date.now())
  tasks.forEach(t => {
    console.log(`${t.name}: ${formatTime(t.totalTime)}`)
  })
}
```

## Benefits

✅ **Framework-agnostic** - Use with React, Vue, Svelte, plain JS, CLI, mobile, etc.
✅ **Testable** - Pure functions, no side effects
✅ **Modular** - Each concern separated
✅ **Extensible** - Easy to add new storage backends
✅ **Type-safe** - Full TypeScript support
✅ **No dependencies** - Core logic has zero external dependencies
✅ **Predictable** - Immutable state management

## Testing

Since all functions are pure, testing is simple:

```typescript
import { TaskOperations, TaskQueries } from '@/core'

test('add task', () => {
  const state = { tasks: [], history: [], lastModified: 0 }
  const newState = TaskOperations.addTask('Test', state)
  expect(newState.tasks).toHaveLength(1)
  expect(newState.tasks[0].name).toBe('Test')
})

test('calculate time', () => {
  const history = [
    { taskId: 'a', timestamp: 0 },
    { taskId: 'b', timestamp: 5000 },
    { taskId: 'a', timestamp: 10000 }
  ]
  const stats = calculateTaskStats('a', history, 15000)
  expect(stats.totalTime).toBe(10) // 5 + 5 seconds
})
```

## Next Steps

Now that you have the core logic extracted, you can:

1. **Build a React UI** - Import and use the core module
2. **Build a CLI** - Use the core module in Node.js scripts
3. **Build a mobile app** - Use React Native with the core module
4. **Build a backend API** - Expose the core operations via HTTP
5. **Build a desktop app** - Use Electron with the core module
6. **Share with teammates** - Core logic is decoupled from UI

All use the same business logic!
