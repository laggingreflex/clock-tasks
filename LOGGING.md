# Logging System

This project has a comprehensive logging system built in to help with debugging and monitoring.

## Overview

- **Prefix**: All logs are prefixed with `[clock-tasks]` followed by the module name
- **Module Tracking**: Each module creates its own logger with a specific module name for easy identification
- **Log Levels**: `log` (user actions), `info` (informational), `debug` (detailed debugging), `warn` (warnings), `error` (errors)
- **Production**: Debug logs are automatically disabled in production builds

## Usage

### In Core Modules

```typescript
import { createLogger } from '../utils/logger'

const log = createLogger('TaskManager')

// User-level action (important)
log.log(`✚ Add task: "${name}" (id: ${id})`)

// Debug info (detailed, disabled in production)
log.debug('addTask state before:', state.tasks.length, 'tasks')

// Error handling
log.error('Failed to sync:', error)
```

### In Hooks

```typescript
import { createLogger } from '../utils/logger'

const log = createLogger('useTaskState')

log.log(`📍 useTaskState initialized: ${initialTasks.length} tasks`)
```

### In Services

```typescript
import { createLogger } from '../utils/logger'

const log = createLogger('GoogleDriveService')

log.log(`☁️ Google Drive initialized: ${tasks.length} tasks`)
log.debug('Syncing to Google Drive...')
```

## Log Output Examples

When running the app or tests, you'll see logs like:

```
[clock-tasks][TaskManager] ✚ Add task: "Work" (id: 1234567890)
[clock-tasks][TaskManager] ▶ Start task: "Work" (id: 1234567890) at 1234567890ms
[clock-tasks][TaskManager] ✏ Rename task: "Work" → "Focus Time"
[clock-tasks][TaskManager] 🗑 Delete task: "Focus Time"
[clock-tasks][TaskManager] ⟲ Reset all timers
[clock-tasks][TaskManager] ⏸ Pause task: "Work"

[clock-tasks][Storage] 📥 LocalStorage load: 3 tasks, 5 clicks
[clock-tasks][Storage] 📤 LocalStorage save: 3 tasks, 5 clicks

[clock-tasks][useSyncEffect] 🔐 User logged in: John Doe
[clock-tasks][useSyncEffect] ☁️ Google Drive initialized: 3 tasks, 5 clicks

[clock-tasks][GoogleDriveService] ☁️ Found ClockTasks folder: abc123xyz
[clock-tasks][GoogleDriveService] ☁️ Successfully synced to Google Drive
```

## Icons Used

- `✚` - Adding tasks
- `▶` - Starting/clicking tasks
- `✏` - Editing/renaming
- `🗑` - Deleting
- `⟲` - Resetting
- `⏸` - Pausing
- `📥` - Loading from storage
- `📤` - Saving to storage
- `🔐` - Authentication
- `☁️` - Google Drive operations
- `📍` - Hook initialization
- `👤` - User actions
- `✓` - Confirmations

## Modules with Logging

- **TaskManager** - Core task operations (add, start, update, delete)
- **Storage** - LocalStorage and InMemory backends
- **useSyncEffect** - Google Drive sync
- **GoogleDriveService** - Drive API calls
- **useTaskState** - Task state initialization
- **useTaskHandlers** - User action handlers
- **StorageHelpers** - Storage utilities
- **Calculations** - Time calculations (debug only)

## Debug Mode

Debug logs are only shown in development:

```typescript
log.debug('detailed info') // Only shown during development
log.log('important action') // Always shown
```

To see all debug logs, ensure you're running in development mode (not production build).

## Filtering Logs

In the browser console, you can filter by module:

```javascript
// Show only TaskManager logs
console.log.bind(console, '[clock-tasks][TaskManager]')

// Search in DevTools console for: [clock-tasks][TaskManager]
```
