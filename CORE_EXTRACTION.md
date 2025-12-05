# Core Logic Extraction - Migration Guide

## What Changed

The **entire business logic** has been extracted into a framework-agnostic core module that's completely independent of React or any UI framework.

## Directory Structure

```
src/
├── core/                    ← NEW: Framework-agnostic business logic
│   ├── types.ts            # Data types
│   ├── calculations.ts      # Pure calculation functions
│   ├── storage.ts          # Storage backends (localStorage, etc.)
│   ├── taskManager.ts      # State operations (TaskOperations, TaskQueries)
│   ├── timeFormatter.ts    # Time formatting
│   ├── index.ts            # Public API
│   └── README.md           # Detailed documentation
│
├── components/             ← UI layer (React components)
├── utils/                  ← Can be refactored to use core/
├── services/               ← Google Drive service (can use core/)
└── App.tsx                 ← Main React component
```

## Key Exports from `src/core`

### Types
- `TaskData` - Task definition
- `ClickEvent` - Click history entry
- `Task` - Task with computed runtime
- `StoredData` - Full storage format
- `TaskStats` - Calculated statistics
- `StorageBackend` - Storage interface

### Operations (Immutable)
- `TaskOperations.addTask()`
- `TaskOperations.addAndStartTask()`
- `TaskOperations.startTask()`
- `TaskOperations.updateTaskName()`
- `TaskOperations.deleteTask()`
- `TaskOperations.deleteAllTasks()`
- `TaskOperations.resetAllTasks()`
- `TaskOperations.pauseCurrentTask()`

### Queries
- `TaskQueries.getAllTasks()`
- `TaskQueries.getTask()`
- `TaskQueries.getCurrentRunningTaskId()`
- `TaskQueries.getTotalElapsedTime()`
- `TaskQueries.taskExists()`

### Storage
- `LocalStorageBackend` - localStorage implementation
- `InMemoryBackend` - In-memory for testing
- `loadFromLocalStorage()` / `saveToLocalStorage()` - Helpers

### Utilities
- `formatTime()` - Format seconds to readable string
- `calculateTaskStats()` - Calculate task statistics
- `convertTaskDataList()` - Convert raw data to display tasks

## How to Migrate Existing Code

### Option 1: Keep existing files as-is
The core module works alongside the existing React components. You can gradually migrate.

### Option 2: Refactor React components to use core
Replace direct state management with core operations:

**Before:**
```typescript
import { addTask } from './utils/taskOperations'

const handleAddTask = (name: string) => {
  addTask(name, taskDataList, clickHistory, onTaskAdded, syncToGoogleDrive)
  // Complex callback pattern
}
```

**After:**
```typescript
import { TaskOperations } from '@/core'

const handleAddTask = (name: string) => {
  const newState = TaskOperations.addAndStartTask(name, {
    tasks: taskDataList,
    clickHistory,
    lastModified: Date.now()
  })
  setTaskDataList(newState.tasks)
  setClickHistory(newState.clickHistory)
  // Clean functional pattern
}
```

### Option 3: Create multiple UIs using the same core
Now you can build:
- CLI interface
- Mobile app
- Discord bot
- Web dashboard
- Desktop app

All using the exact same business logic!

## Next Steps

1. **Keep both working** - Old React UI + new core module
2. **Test the core** - Write tests for business logic
3. **Gradually migrate** - Update React components one by one
4. **Build new UIs** - Create CLI, mobile, etc. using core
5. **Remove old files** - Clean up when fully migrated

## File Structure for New UIs

### CLI Example
```
src/
├── core/           ← Shared business logic
├── ui/
│   ├── react/      ← React UI (existing)
│   ├── cli/        ← New CLI UI
│   └── mobile/     ← New mobile UI
└── services/       ← Shared services (Google Drive, etc.)
```

### Usage
```typescript
// cli/commands/addTask.ts
import { TaskOperations, TaskQueries, LocalStorageBackend } from '@/core'

async function addTask(name: string) {
  const storage = new LocalStorageBackend()
  const data = await storage.load()
  
  const newState = TaskOperations.addAndStartTask(name, data)
  await storage.save(newState)
  
  console.log(`Added: ${name}`)
}
```

## Benefits of This Architecture

✅ **Reusability** - One business logic, multiple UIs
✅ **Testability** - Pure functions, easy to test
✅ **Maintainability** - Clear separation of concerns
✅ **Scalability** - Easy to add new features to core
✅ **Flexibility** - Can be used in any environment (browser, Node.js, React Native, etc.)

## Documentation

See `src/core/README.md` for detailed documentation with examples.

## Questions?

The core module is:
- ✅ Framework-agnostic
- ✅ Zero external dependencies
- ✅ Fully typed with TypeScript
- ✅ Documented with examples
- ✅ Ready to use in any UI
