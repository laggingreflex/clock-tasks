# Architecture Overview

## System Design

```
┌─────────────────────────────────────────────────────────────────┐
│                        USER INTERFACE LAYER                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐           │
│  │   React UI   │  │   CLI Tool   │  │  Mobile App  │  ...      │
│  └──────────────┘  └──────────────┘  └──────────────┘           │
└─────────────────────────────────────────────────────────────────┘
                              ↓ uses
┌─────────────────────────────────────────────────────────────────┐
│                    CORE BUSINESS LOGIC LAYER                    │
│                    (Framework-Agnostic)                         │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  TaskOperations & TaskQueries (State Management)      │    │
│  │  ├── addTask()                                         │    │
│  │  ├── startTask()                                       │    │
│  │  ├── deleteTask()                                      │    │
│  │  ├── getAllTasks()                                     │    │
│  │  └── getTotalElapsedTime()                             │    │
│  └────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Calculations (Pure Functions)                         │    │
│  │  ├── calculateTaskStats()                              │    │
│  │  ├── calculateTotalElapsedTime()                        │    │
│  │  └── getCurrentRunningTaskId()                          │    │
│  └────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Data Types                                            │    │
│  │  ├── TaskData                                          │    │
│  │  ├── ClickEvent                                        │    │
│  │  ├── Task                                              │    │
│  │  └── StoredData                                        │    │
│  └────────────────────────────────────────────────────────┘    │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Utilities                                             │    │
│  │  └── formatTime()                                      │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
                              ↓ uses
┌─────────────────────────────────────────────────────────────────┐
│                    PERSISTENCE LAYER                             │
│  ┌────────────────────────────────────────────────────────┐    │
│  │  Storage Backends (Pluggable)                         │    │
│  │  ├── LocalStorageBackend                               │    │
│  │  ├── InMemoryBackend                                   │    │
│  │  ├── IndexedDBBackend (custom)                         │    │
│  │  ├── FirebaseBackend (custom)                          │    │
│  │  └── CustomAPIBackend (custom)                         │    │
│  └────────────────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────────────────┘
```

## Data Flow

### Reading Data
```
┌─────────────┐
│  Storage    │
└──────┬──────┘
       │ .load()
       ↓
┌──────────────┐
│  StoredData  │
└──────┬───────┘
       │ TaskQueries.getAllTasks(state, now)
       ↓
┌────────────────────┐
│  Task[] (computed) │
└─────────────────────┘
       │
       │ Display to UI
       ↓
    [UI Layer]
```

### Writing Data
```
[User Action]
       │
       ↓
┌──────────────────────┐
│ TaskOperations.*()   │ (Immutable)
└──────────┬───────────┘
           │
           ↓
    ┌─────────────┐
    │ New State   │
    └──────┬──────┘
           │ .save()
           ↓
    ┌──────────────┐
    │  Storage     │
    └──────────────┘
```

## Time Calculation Example

### Scenario
```
Timeline:
  10:00  Task A clicked → Click 1 (taskId: A, timestamp: 600000)
  10:05  Task B clicked → Click 2 (taskId: B, timestamp: 900000)
  10:10  Task A clicked → Click 3 (taskId: A, timestamp: 1200000)
  10:15  Task B clicked → Click 4 (taskId: B, timestamp: 1500000)
  10:20  [NOW]
```

### Calculation
```
Task A:
  ├─ Click 1 → Click 2: 900000 - 600000 = 300000ms = 300s = 5min
  └─ Click 3 → Click 4: 1500000 - 1200000 = 300000ms = 300s = 5min
  └─ Total: 10 minutes

Task B (currently running):
  ├─ Click 2 → Click 3: 1200000 - 900000 = 300000ms = 300s = 5min
  └─ Click 4 → NOW: 1800000 - 1500000 = 300000ms = 300s = 5min
  └─ Total: 10 minutes

Current Session:
  Task B: 5 minutes (running)
Last Session:
  Task A: 5 minutes
```

## State Structure

```typescript
// TaskManagerState (core state)
{
  tasks: [
    { id: "1701846000000", name: "Buy groceries" },
    { id: "1701846005000", name: "Workout" },
    { id: "1701846010000", name: "Study" }
  ],
  clickHistory: [
    { taskId: "1701846000000", timestamp: 1701846000000 },  // 10:00:00
    { taskId: "1701846005000", timestamp: 1701846300000 },  // 10:05:00
    { taskId: "1701846000000", timestamp: 1701846600000 },  // 10:10:00
    { taskId: "1701846010000", timestamp: 1701846900000 }   // 10:15:00
  ],
  lastModified: 1701846900000
}

         ↓ TaskQueries.getAllTasks(state, now)

// Computed Display Tasks
[
  {
    id: "1701846000000",
    name: "Buy groceries",
    isRunning: false,
    currentSessionTime: 0,
    lastSessionTime: 300,  // Last session was 5 min
    totalTime: 600         // Total 10 min
  },
  {
    id: "1701846005000",
    name: "Workout",
    isRunning: false,
    currentSessionTime: 0,
    lastSessionTime: 300,
    totalTime: 300
  },
  {
    id: "1701846010000",
    name: "Study",
    isRunning: true,       // Currently running
    currentSessionTime: 150, // 2.5 minutes (NOW - click time)
    lastSessionTime: 0,
    totalTime: 150
  }
]
```

## Operation Flow Example

### Adding and Starting a Task
```
User types "Buy groceries" and presses Enter
                   │
                   ↓
    TaskOperations.addAndStartTask("Buy groceries", state)
                   │
                   ├─ Generate unique ID: "1701846000000"
                   ├─ Create TaskData: { id, name: "Buy groceries" }
                   ├─ Record click event: { taskId: id, timestamp: now }
                   │
                   ↓
    Return new state: {
      tasks: [...state.tasks, { id: "1701846000000", name: "Buy groceries" }],
      clickHistory: [...state.clickHistory, { taskId: "1701846000000", timestamp: 1701846000000 }],
      lastModified: 1701846000000
    }
                   │
                   ↓
    Component updates state: setTaskDataList(newState.tasks)
    Component updates state: setClickHistory(newState.clickHistory)
                   │
                   ↓
    Component calls: storage.save(newState)
                   │
                   ↓
    Storage persists to localStorage
                   │
                   ↓
    UI re-renders with new task visible and running
```

## Module Dependencies

```
index.ts
  ├── types.ts (no dependencies)
  ├── calculations.ts
  │   └── types.ts
  ├── taskManager.ts
  │   ├── types.ts
  │   └── calculations.ts
  ├── storage.ts
  │   └── types.ts
  ├── timeFormatter.ts (no dependencies)
  └── [exports all public API]

React Component (example)
  └── @/core
      └── [uses: TaskOperations, TaskQueries, storage, formatting]
```

## Design Principles

### 1. Immutability
Never mutate state. Always return new objects:
```typescript
// ❌ BAD
state.tasks.push(newTask)
return state

// ✅ GOOD
return {
  ...state,
  tasks: [...state.tasks, newTask]
}
```

### 2. Pure Functions
Same input → Same output, no side effects:
```typescript
// ❌ BAD - Has side effects
function addTask(name, state) {
  localStorage.setItem('data', JSON.stringify(state))  // Side effect!
  return newState
}

// ✅ GOOD - Pure function
function addTask(name, state) {
  return newState
}
// Let the caller handle persistence
```

### 3. Separation of Concerns
```
Operations  → Modify state
Queries     → Read from state
Calculations→ Compute derived values
Storage     → Persist state
Formatting  → Display values
```

### 4. Pluggable Storage
Interface:
```typescript
interface StorageBackend {
  load(): Promise<StoredData>
  save(data: StoredData): Promise<void>
  clear(): Promise<void>
}
```

Implementations can be added without changing core logic.

## Testing Strategy

### Unit Tests
```typescript
test('TaskOperations.addTask', () => {
  const state = { tasks: [], clickHistory: [], lastModified: 0 }
  const result = TaskOperations.addTask('Test', state)
  expect(result.tasks).toHaveLength(1)
  expect(result.tasks[0].name).toBe('Test')
})
```

### Integration Tests
```typescript
test('Full workflow', async () => {
  const storage = new InMemoryBackend()
  let state = { tasks: [], clickHistory: [], lastModified: 0 }
  
  // Add task
  state = TaskOperations.addAndStartTask('Work', state)
  await storage.save(state)
  
  // Load and verify
  const loaded = await storage.load()
  const tasks = TaskQueries.getAllTasks(loaded, Date.now())
  expect(tasks[0].isRunning).toBe(true)
})
```

All testing is straightforward because functions are pure!
