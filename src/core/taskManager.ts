/**
 * Core task management logic
 * All business operations for managing tasks, independent of UI framework
 */

import type { TaskData, ClickEvent, StoredData, Task } from './types'
import { calculateTaskStats, getCurrentRunningTaskId as getRunningTaskId, convertTaskDataList } from './calculations'
// Removed custom logger; use console.* with explicit prefixes
const LOG_PREFIX_FILE = '[clock-tasks][TaskManager]'

export interface TaskManagerState {
  tasks: TaskData[]
  history: ClickEvent[]
  lastModified: number
}

export interface TaskManagerConfig {
  onBeforeSave?: (data: StoredData) => void | Promise<void>
  onAfterSave?: (data: StoredData) => void | Promise<void>
}

/**
 * Pure task operations - functions that return new state without mutations
 */
export const TaskOperations = {
  /**
   * Add a new task
   */
  addTask(
    name: string,
    currentState: TaskManagerState,
    getTimestamp: () => number = () => Date.now()
  ): TaskManagerState {
    if (!name.trim()) {
      console.debug(`${LOG_PREFIX_FILE}:addTask`, 'addTask rejected: empty name')
      return currentState
    }

    const timestamp = getTimestamp()
    const id = timestamp.toString()
    const newTaskData: TaskData = {
      id,
      name: name.trim()
    }

    console.log(`${LOG_PREFIX_FILE}:addTask`, `✚ Add task: "${name}" (id: ${id})`)
    console.debug(`${LOG_PREFIX_FILE}:addTask`, 'addTask state before:', currentState.tasks.length, 'tasks')

    return {
      ...currentState,
      tasks: [...currentState.tasks, newTaskData],
      lastModified: timestamp
    }
  },

  /**
   * Add a task and start it immediately
   */
  addAndStartTask(
    name: string,
    currentState: TaskManagerState,
    getTimestamp: () => number = () => Date.now()
  ): TaskManagerState {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:addAndStartTask`
    if (!name.trim()) {
      console.debug(LOG_PREFIX_FN, 'addAndStartTask rejected: empty name')
      return currentState
    }

    const timestamp = getTimestamp()
    const id = timestamp.toString()

    const newTaskData: TaskData = {
      id,
      name: name.trim()
    }

    console.log(LOG_PREFIX_FN, `✚ Add & start task: "${name}" (id: ${id}) at ${timestamp}ms`)
    console.debug(LOG_PREFIX_FN, 'addAndStartTask - current running:', getRunningTaskId(currentState.history))

    return {
      ...currentState,
      tasks: [...currentState.tasks, newTaskData],
      history: [...currentState.history, { taskId: id, timestamp }],
      lastModified: timestamp
    }
  },

  /**
   * Start/click a task
   */
  startTask(
    id: string,
    currentState: TaskManagerState,
    getTimestamp: () => number = () => Date.now()
  ): TaskManagerState {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:startTask`
    const timestamp = getTimestamp()
    const taskName = currentState.tasks.find(t => t.id === id)?.name || 'unknown'
    const wasPreviouslyRunning = getRunningTaskId(currentState.history)

    console.log(LOG_PREFIX_FN, `▶ Start task: "${taskName}" (id: ${id}) at ${timestamp}ms`)
    if (wasPreviouslyRunning !== id) {
      const prevName = currentState.tasks.find(t => t.id === wasPreviouslyRunning)?.name || 'none'
      console.debug(LOG_PREFIX_FN, `startTask - switching from "${prevName}" to "${taskName}"`)
    }

    return {
      ...currentState,
      history: [...currentState.history, { taskId: id, timestamp }],
      lastModified: timestamp
    }
  },

  /**
   * Update task name
   */
  updateTaskName(
    id: string,
    name: string,
    currentState: TaskManagerState,
    getTimestamp: () => number = () => Date.now()
  ): TaskManagerState {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:updateTaskName`
    const oldName = currentState.tasks.find(t => t.id === id)?.name || 'unknown'
    console.log(LOG_PREFIX_FN, `✏ Rename task: "${oldName}" → "${name}" (id: ${id})`)

    return {
      ...currentState,
      tasks: currentState.tasks.map(td => (td.id === id ? { ...td, name } : td)),
      lastModified: getTimestamp()
    }
  },

  /**
   * Delete a single task
   */
  deleteTask(
    id: string,
    currentState: TaskManagerState,
    getTimestamp: () => number = () => Date.now()
  ): TaskManagerState {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:deleteTask`
    const taskName = currentState.tasks.find(t => t.id === id)?.name || 'unknown'
    const clicksRemoved = currentState.history.filter(e => e.taskId === id).length

    console.log(LOG_PREFIX_FN, `🗑 Delete task: "${taskName}" (id: ${id}) - removed ${clicksRemoved} click events`)

    return {
      ...currentState,
      tasks: currentState.tasks.filter(td => td.id !== id),
      history: currentState.history.filter(e => e.taskId !== id),
      lastModified: getTimestamp()
    }
  },

  /**
   * Delete all tasks
   */
  deleteAllTasks(
    _currentState: TaskManagerState,
    getTimestamp: () => number = () => Date.now()
  ): TaskManagerState {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:deleteAllTasks`
    console.log(LOG_PREFIX_FN, `🗑 Delete all tasks - clearing entire state`)
    return {
      tasks: [],
      history: [],
      lastModified: getTimestamp()
    }
  },

  /**
   * Reset all timers (clear click history)
   */
  resetAllTasks(
    currentState: TaskManagerState,
    getTimestamp: () => number = () => Date.now()
  ): TaskManagerState {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:resetAllTasks`
    const tasksCount = currentState.tasks.length
    const clicksCount = currentState.history.length
    console.log(LOG_PREFIX_FN, `⟲ Reset all timers - clearing ${clicksCount} click events for ${tasksCount} tasks`)

    return {
      ...currentState,
      history: [],
      lastModified: getTimestamp()
    }
  },

  /**
   * Stop all tasks by adding a sentinel click event
   * This preserves all task history and last session times
   */
  stopAllTasks(
    currentState: TaskManagerState,
    getTimestamp: () => number = () => Date.now()
  ): TaskManagerState {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:stopAllTasks`
    if (currentState.history.length === 0) {
      console.debug(LOG_PREFIX_FN, 'stopAllTasks: no tasks running')
      return currentState
    }

    const runningTaskId = getRunningTaskId(currentState.history)
    const taskName = currentState.tasks.find(t => t.id === runningTaskId)?.name || 'unknown'
    console.log(LOG_PREFIX_FN, `⏹ Stop all tasks (was running: "${taskName}")`)

    // Add a click for a non-existent task ID to stop everything
    // This preserves all history and last session calculations
    return {
      ...currentState,
      history: [...currentState.history, { taskId: '__STOP__', timestamp: getTimestamp() }],
      lastModified: getTimestamp()
    }
  }
}

/**
 * Query functions - get computed data from state
 */
export const TaskQueries = {
  /**
   * Get all tasks with computed runtime information
   */
  getAllTasks(
    state: TaskManagerState,
    now: number
  ): Task[] {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:getAllTasks`
    const tasks = convertTaskDataList(state.tasks, state.history, now)
    console.debug(LOG_PREFIX_FN, `getAllTasks: ${tasks.length} tasks, running: ${tasks.filter(t => t.isRunning).map(t => t.name).join(', ') || 'none'}`)
    return tasks
  },

  /**
   * Get a specific task
   */
  getTask(
    id: string,
    state: TaskManagerState,
    now: number
  ): Task | undefined {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:getTask`
    const taskData = state.tasks.find(t => t.id === id)
    if (!taskData) {
      console.debug(LOG_PREFIX_FN, `getTask: task not found (id: ${id})`)
      return undefined
    }

    const isRunning = id === getRunningTaskId(state.history)
    const stats = calculateTaskStats(id, state.history, now)

    const task = {
      id: taskData.id,
      name: taskData.name,
      isRunning,
      currentSessionTime: isRunning ? stats.currentSessionTime : 0,
      lastSessionTime: !isRunning ? stats.currentSessionTime : 0,
      totalTime: stats.totalTime
    }

    console.debug(LOG_PREFIX_FN, `getTask: "${taskData.name}" - running: ${isRunning}, total: ${stats.totalTime}s`)
    return task
  },

  /**
   * Get currently running task ID
   */
  getCurrentRunningTaskId(state: TaskManagerState): string | undefined {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:getCurrentRunningTaskId`
    const id = getRunningTaskId(state.history)
    const taskName = id ? state.tasks.find(t => t.id === id)?.name : 'none'
    console.debug(LOG_PREFIX_FN, `getCurrentRunningTaskId: "${taskName}" (id: ${id})`)
    return id
  },

  /**
   * Get total elapsed time across all tasks
   */
  getTotalElapsedTime(
    state: TaskManagerState,
    now: number
  ): number {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:getTotalElapsedTime`
    const tasks = this.getAllTasks(state, now)
    const total = tasks.reduce((sum, t) => sum + t.totalTime, 0)
    console.debug(LOG_PREFIX_FN, `getTotalElapsedTime: ${total}s across ${tasks.length} tasks`)
    return total
  },

  /**
   * Check if task exists
   */
  taskExists(id: string, state: TaskManagerState): boolean {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:taskExists`
    const exists = state.tasks.some(t => t.id === id)
    console.debug(LOG_PREFIX_FN, `taskExists: id ${id} - ${exists ? 'found' : 'not found'}`)
    return exists
  }
}
