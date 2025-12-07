/**
 * Core Business Logic Module
 *
 * This is a complete framework-agnostic business logic layer that can be
 * used with any UI framework (React, Vue, Svelte, CLI, mobile, etc.)
 *
 * The module is organized into:
 * - Types: Data structures
 * - Calculations: Pure functions for computing task statistics
 * - Storage: Persistence layer (localStorage, API, IndexedDB, etc.)
 * - TaskManager: State management operations and queries
 * - TimeFormatter: Utilities for formatting time
 */

// Data types
export type { TaskData, ClickEvent, StoredData, Task, TaskStats, StorageBackend } from './types'
export type { TaskManagerState, TaskManagerConfig } from './taskManager'

// Calculation functions
export {
  calculateTaskStats,
  getCurrentRunningTaskId,
  calculateTotalElapsedTime,
  taskDataToTask,
  convertTaskDataList,
  calculateTaskPercentage
} from './calculations'

// Storage backends and helpers
// Note: Browser-specific LocalStorage backend and helpers live in services/providers.
// Core only exposes the in-memory backend for tests and provider-agnostic types/utilities.
export { InMemoryBackend } from './storage'

// Task operations and queries
export { TaskOperations, TaskQueries } from './taskManager'

// Time formatting
export { formatTime } from './timeFormatter'

/**
 * Example usage:
 *
 * // Initialize state
 * const state = {
 *   tasks: [],
 *   history: [],
 *   lastModified: Date.now()
 * }
 *
 * // Add a task
 * const newState = TaskOperations.addAndStartTask('Buy groceries', state)
 *
 * // Get all tasks with computed time
 * const tasks = TaskQueries.getAllTasks(newState, Date.now())
 *
 * // Save to storage
 * const storage = new LocalStorageBackend()
 * await storage.save({
 *   tasks: newState.tasks,
 *   history: newState.history,
 *   lastModified: newState.lastModified
 * })
 *
 * // Format time
 * console.log(formatTime(3661)) // "1.0h"
 */
