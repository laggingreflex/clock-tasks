# Core API Quick Reference Card

## Import
```typescript
import {
  // Types
  type TaskData,
  type ClickEvent,
  type Task,
  type StoredData,
  type TaskStats,
  type StorageBackend,
  type TaskManagerState,
  
  // Operations
  TaskOperations,
  TaskQueries,
  
  // Storage
  LocalStorageBackend,
  InMemoryBackend,
  saveToLocalStorage,
  loadFromLocalStorage,
  clearLocalStorage,
  
  // Utilities
  formatTime,
  calculateTaskStats,
  convertTaskDataList,
  calculateTaskPercentage,
  getCurrentRunningTaskId
} from '@/core'
```

## State Type
```typescript
interface TaskManagerState {
  tasks: TaskData[]           // { id: string, name: string }[]
  clickHistory: ClickEvent[]  // { taskId: string, timestamp: number }[]
  lastModified: number        // Unix timestamp
}
```

## TaskOperations (Modify State)

All functions take `TaskManagerState` and return new `TaskManagerState` (immutable).

```typescript
// Create state
let state: TaskManagerState = {
  tasks: [],
  clickHistory: [],
  lastModified: Date.now()
}

// Add task only
state = TaskOperations.addTask('My Task', state)

// Add task and start it
state = TaskOperations.addAndStartTask('My Task', state)

// Start/click a task
state = TaskOperations.startTask('task-123', state)

// Rename task
state = TaskOperations.updateTaskName('task-123', 'New Name', state)

// Delete task (removes task + all its clicks)
state = TaskOperations.deleteTask('task-123', state)

// Delete all tasks
state = TaskOperations.deleteAllTasks(state)

// Clear timers (keeps tasks, removes all clicks)
state = TaskOperations.resetAllTasks(state)

// Pause current task
state = TaskOperations.pauseCurrentTask(state)
```

## TaskQueries (Read State)

All functions take `TaskManagerState` and optional `now: number` (current time).

```typescript
const now = Date.now()

// Get all tasks with computed data
const tasks: Task[] = TaskQueries.getAllTasks(state, now)
// Returns: {
//   id, name, isRunning, 
//   currentSessionTime, lastSessionTime, totalTime
// }[]

// Get specific task
const task: Task | undefined = TaskQueries.getTask('task-123', state, now)

// Get currently running task ID
const runningId: string | undefined = TaskQueries.getCurrentRunningTaskId(state)

// Get total time across all tasks
const total: number = TaskQueries.getTotalElapsedTime(state, now)  // in seconds

// Check if task exists
const exists: boolean = TaskQueries.taskExists('task-123', state)
```

## Storage

```typescript
// LocalStorage backend
const storage = new LocalStorageBackend()
const data = await storage.load()        // Promise<StoredData>
await storage.save(state)                 // Promise<void>
await storage.clear()                     // Promise<void>

// In-memory backend (testing)
const storage = new InMemoryBackend()    // Same interface

// Or implement custom
class FirebaseBackend implements StorageBackend {
  async load(): Promise<StoredData> { /* ... */ }
  async save(data: StoredData): Promise<void> { /* ... */ }
  async clear(): Promise<void> { /* ... */ }
}
```

## Calculations

```typescript
// Calculate stats for one task
const stats = calculateTaskStats(
  'task-123',           // taskId
  state.clickHistory,   // all clicks
  Date.now()            // current time
)
// Returns: { currentSessionTime, lastSessionTime, totalTime }

// Get current running task ID
const currentId = getCurrentRunningTaskId(state.clickHistory)

// Convert raw TaskData to display Task
const tasks = convertTaskDataList(
  state.tasks,
  state.clickHistory,
  Date.now()
)

// Calculate percentage
const percent = calculateTaskPercentage(
  task.totalTime,  // task time in seconds
  totalTime        // total time in seconds
)
// Returns: "25.5"

// Format seconds for display
const formatted = formatTime(3661)  // "1.0h"
```

## Common Patterns

### React Hook Pattern
```typescript
const [state, setState] = useState<TaskManagerState>(initialState)

const updateState = (newState: TaskManagerState) => {
  setState(newState)
  storage.save(newState)
}

const addTask = (name: string) => {
  const newState = TaskOperations.addAndStartTask(name, state)
  updateState(newState)
}
```

### CLI Pattern
```typescript
const storage = new LocalStorageBackend()
let state = await storage.load()

state = TaskOperations.addAndStartTask('Work', state)
await storage.save(state)

const tasks = TaskQueries.getAllTasks(state, Date.now())
console.log(tasks)
```

### API Route Pattern
```typescript
app.post('/tasks', async (req, res) => {
  let state = await storage.load()
  state = TaskOperations.addAndStartTask(req.body.name, state)
  await storage.save(state)
  res.json(TaskQueries.getAllTasks(state, Date.now()))
})
```

## Task Type (Output)
```typescript
interface Task {
  id: string                 // UUID
  name: string               // Task name
  isRunning: boolean         // Is currently active?
  currentSessionTime: number // Seconds since last click (if running)
  lastSessionTime: number    // Seconds from previous session
  totalTime: number          // Total seconds (sum of all sessions)
}
```

## Key Principles

1. **Immutable** - Never modify state, always return new object
2. **Pure** - No side effects, same input = same output
3. **Functional** - Compose operations together
4. **Testable** - All functions are pure, easy to test
5. **Reusable** - Works in any framework/environment

## Time Unit

All time values are in **SECONDS**:
- `currentSessionTime: number` → seconds
- `lastSessionTime: number` → seconds
- `totalTime: number` → seconds
- `ClickEvent.timestamp: number` → milliseconds ⚠️ (NOTE: timestamps are milliseconds!)

Convert: `totalTimeSeconds = Math.floor((timestamp2 - timestamp1) / 1000)`

## Persistence

To use state, you must:
1. Load: `const state = await storage.load()`
2. Modify: `const newState = TaskOperations.*(state)`
3. Save: `await storage.save(newState)`

OR use a custom hook/composable that handles this automatically.

## Zero Dependencies

The core module has **zero external dependencies**. It's pure TypeScript. This means:
- ✅ Works anywhere (browser, Node.js, React Native, etc.)
- ✅ No package bloat
- ✅ No version conflicts
- ✅ No security issues in dependencies
- ✅ Tiny bundle size

## Validation

**TaskOperations functions validate input:**
- `addTask()` - Returns unchanged state if name is empty
- `startTask()` - No validation (will add click for any ID)
- `deleteTask()` - Returns new state with task removed
- `updateTaskName()` - Returns unchanged state if name is empty
- All others - No validation, pass through

**No automatic error handling** - You handle UI errors as needed.

## Time Calculation Example

```typescript
// Timeline:
const history = [
  { taskId: 'A', timestamp: 1000 }, // 10:00
  { taskId: 'B', timestamp: 5000 }, // 10:05 (A ran 5s)
  { taskId: 'A', timestamp: 9000 }  // 10:09 (B ran 4s)
  // NOW is 10000ms
]

const statsA = calculateTaskStats('A', history, 10000)
// currentSessionTime = 1000ms = 1s (from 9000 to NOW)
// lastSessionTime = 5000ms = 5s (from 1000 to 5000)
// totalTime = 6s

const statsB = calculateTaskStats('B', history, 10000)
// currentSessionTime = 0 (not running)
// lastSessionTime = 0 (previous was 'A')
// totalTime = 4s (from 5000 to 9000)
```

## Pro Tips

💡 **Always await storage operations:**
```typescript
// ❌ Bad
storage.save(state)

// ✅ Good
await storage.save(state)
```

💡 **Use `now` parameter consistently:**
```typescript
// ❌ Bad - different now for each call
const t1 = TaskQueries.getAllTasks(state, Date.now())
const t2 = TaskQueries.getTotalElapsedTime(state, Date.now())

// ✅ Good - same now
const now = Date.now()
const t1 = TaskQueries.getAllTasks(state, now)
const t2 = TaskQueries.getTotalElapsedTime(state, now)
```

💡 **Don't mutate state:**
```typescript
// ❌ Bad
state.tasks.push(newTask)
return state

// ✅ Good
return {
  ...state,
  tasks: [...state.tasks, newTask],
  lastModified: Date.now()
}
```

💡 **Test with InMemoryBackend:**
```typescript
const storage = new InMemoryBackend()
const state = await storage.load()
// No filesystem/network, super fast tests
```

## See Also

- `src/core/README.md` - Full documentation
- `CORE_ARCHITECTURE.md` - System design
- `CORE_QUICK_START.md` - Framework examples
- `CORE_SUMMARY.md` - Overview
