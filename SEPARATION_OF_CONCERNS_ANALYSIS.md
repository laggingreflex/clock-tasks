# Code Separation Analysis: Core Business Logic vs React

## Summary
✅ **Good separation overall.** The core business logic is cleanly isolated from React with proper layers. However, there are **minor issues** in the hooks/component layer that could be improved for stress testing the core mechanics.

---

## Architecture Layers

### 1. **Core Module** (✅ Perfect - React-Free)
**Location:** `src/core/`

**Files:**
- `types.ts` - Pure TypeScript interfaces
- `calculations.ts` - Pure functions for statistics
- `storage.ts` - Storage abstraction layer
- `taskManager.ts` - Core operations and queries
- `timeFormatter.ts` - Time utilities

**Analysis:**
- ✅ **Zero React dependencies**
- ✅ **No side effects** - All pure functions
- ✅ **Framework agnostic** - Can be used in CLI, API, mobile, etc.
- ✅ **Immutable state** - All operations return new state
- ✅ **Well documented** with JSDoc comments

**Key Exports:**
```typescript
// Pure operations (no side effects)
TaskOperations.addTask()
TaskOperations.addAndStartTask()
TaskOperations.startTask()
TaskOperations.updateTaskName()
TaskOperations.deleteTask()
TaskOperations.deleteAllTasks()
TaskOperations.resetAllTasks()
TaskOperations.pauseCurrentTask()

// Query functions
TaskQueries.getAllTasks()
TaskQueries.getTask()
TaskQueries.getCurrentRunningTaskId()
TaskQueries.getTotalElapsedTime()
TaskQueries.taskExists()
```

**Perfect for stress testing:** ✅ Can test core mechanics directly without React

---

### 2. **Utilities Layer** (⚠️ Mostly Good)
**Location:** `src/utils/`

**Key Files:**
- `storageHelpers.ts` - Wrapper around localStorage
- `authHelpers.ts` - Authentication utilities
- `timeFormatter.ts` - Time formatting

**Analysis:**
- ✅ `storageHelpers.ts` - Pure, no React
- ✅ `authHelpers.ts` - Handles user data, no React
- ✅ Functions are framework-agnostic

**Concern:** These utilities use browser APIs (`localStorage`) but that's acceptable since they're storage layer helpers.

---

### 3. **Hooks Layer** (⚠️ React Contamination)
**Location:** `src/hooks/`

**Key Files:**
- `useTaskState.ts` - Initializes state from localStorage
- `useTaskHandlers.ts` - Business logic wrapped in handlers
- `useSyncEffect.ts` - Syncs to Google Drive
- `useUIState.ts` - UI state management
- `useSortedTasks.ts` - Sorting logic
- `useCurrentTime.ts` - Time update logic

**Issues Found:**

#### Issue 1: `useTaskHandlers.ts` - UI Logic Mixed with Core Logic
```typescript
// ❌ PROBLEM: window.confirm() is UI-specific
const handleDeleteTask = (id: string) => {
  if (window.confirm('Delete this task?')) {  // <-- React replacement needed
    updateAndSync(TaskOperations.deleteTask(id, state))
  }
}

const handleDeleteAllTasks = () => {
  if (window.confirm('Delete all tasks?')) {  // <-- React replacement needed
    updateAndSync(TaskOperations.deleteAllTasks(state))
    setDeletionMode(false)
  }
}
```

**Impact on stress testing:** Medium - You can't test deletion handlers without mocking `window.confirm`

#### Issue 2: `useTaskHandlers.ts` - Tightly Coupled to Google Drive
```typescript
const updateAndSync = (newState: TaskManagerState) => {
  setState(newState)
  syncToGoogleDrive(driveFileId, {...})  // <-- Side effect
}
```

**Impact on stress testing:** Medium - Sync is automatic, can't test state management in isolation

#### Issue 3: Direct localStorage Access in `useTaskState.ts`
```typescript
const { tasks: initialTasks, clickHistory: initialClickHistory } =
  loadFromLocalStorage()  // Direct browser API call
```

**Impact:** Low - This is initialization only, acceptable

---

### 4. **Component Layer** (✅ Good)
**Location:** `src/components/`

**Files:**
- `AddTaskForm.tsx`
- `TaskList.tsx`
- `TaskItem.tsx`
- `UserHeader.tsx`
- `Controls.tsx`
- `LoginComponent.tsx`

**Analysis:**
- ✅ Pure presentation components
- ✅ Accept props and callbacks
- ✅ Minimal business logic in components
- ⚠️ UI confirmation dialogs exist (handled in hooks above)

---

## Recommendations for Better Testing

### 1. **Extract Confirmation Logic**
Move `window.confirm` calls outside of handlers:

```typescript
// core/taskManager.ts - add to TaskOperations
export const TaskOperations = {
  // ... existing operations ...

  // These stay pure - no confirmation
  deleteTask(id: string, currentState: TaskManagerState): TaskManagerState { ... }
  deleteAllTasks(currentState: TaskManagerState): TaskManagerState { ... }
}

// hooks/useTaskHandlers.ts - add confirmation at hook level
const handleDeleteTask = async (id: string) => {
  const confirmed = await askForConfirmation('Delete this task?')
  if (confirmed) {
    updateAndSync(TaskOperations.deleteTask(id, state))
  }
}
```

### 2. **Decouple Sync Logic** (Optional, Low Priority)
Consider separating sync logic from state updates:

```typescript
// Better: Update state first, then sync
const updateAndSync = (newState: TaskManagerState) => {
  setState(newState)
  // Sync happens in a separate effect if needed
}

// Or: Use a callback pattern
const handleAddTask = (name: string) => {
  const newState = TaskOperations.addAndStartTask(name, state)
  setState(newState)

  // Let the component/hook decide if it wants to sync
  if (shouldSync) {
    syncToGoogleDrive(...)
  }
}
```

### 3. **Create a Test Harness**
Add a test utilities module:

```typescript
// src/core/__tests__/testHelpers.ts
export function createMockConfirmation(result: boolean) {
  (window as any).confirm = jest.fn(() => result)
}

export function createTestState(): TaskManagerState {
  return {
    tasks: [],
    clickHistory: [],
    lastModified: Date.now()
  }
}
```

---

## Current State for Stress Testing

### ✅ Can Test Directly (Pure Core)
- Task creation, update, deletion
- Calculation of time statistics
- State transformations
- Time calculations

### ⚠️ Needs Mocking (Hooks/Utils)
- Confirmation dialogs
- Google Drive sync
- localStorage persistence
- UI state management

### Example Test Cases Ready to Write

```typescript
// All these can be tested right now with core module
describe('TaskOperations', () => {
  it('should add a task', () => {
    const state = createTestState()
    const newState = TaskOperations.addAndStartTask('Test', state)
    expect(newState.tasks).toHaveLength(1)
    expect(newState.clickHistory).toHaveLength(1)
  })

  it('should calculate task statistics', () => {
    const state = createTestState()
    const task1 = TaskOperations.addAndStartTask('Task1', state)
    // ... manipulate state ...
    const stats = TaskQueries.getAllTasks(task1, Date.now())
    expect(stats[0].totalTime).toBeGreaterThan(0)
  })

  it('should delete and cleanup', () => {
    const state = createTestState()
    const task1 = TaskOperations.addAndStartTask('Task1', state)
    const task2 = TaskOperations.addTask('Task2', task1)
    const withDelete = TaskOperations.deleteTask(task1.tasks[0].id, task2)
    expect(withDelete.tasks).toHaveLength(1)
    expect(withDelete.clickHistory).toHaveLength(0)
  })
})
```

---

## Verdict

| Aspect | Status | Rating |
|--------|--------|--------|
| Core Logic Isolation | ✅ Excellent | 9/10 |
| Pure Functions | ✅ Excellent | 9/10 |
| No React in Core | ✅ Perfect | 10/10 |
| Testability of Core | ✅ Excellent | 9/10 |
| Hook Layer Cleanliness | ⚠️ Good | 7/10 |
| Overall Stress Test Ready | ✅ Ready | 8/10 |

**Conclusion:** Your core business logic is well-separated and ready for stress testing. The hooks layer has minor React integration points (confirmations, syncing) that are acceptable for a React app but could be abstracted further if you plan to use the core logic in other contexts.
