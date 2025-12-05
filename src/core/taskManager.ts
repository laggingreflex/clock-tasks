/**
 * Core task management logic
 * All business operations for managing tasks, independent of UI framework
 */

import type { TaskData, ClickEvent, StoredData, Task } from './types'
import { calculateTaskStats, getCurrentRunningTaskId as getRunningTaskId, convertTaskDataList } from './calculations'
import { createLogger } from '../utils/logger'

const log = createLogger('TaskManager')

export interface TaskManagerState {
  tasks: TaskData[]
  clickHistory: ClickEvent[]
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
      log.debug('addTask rejected: empty name')
      return currentState
    }

    const timestamp = getTimestamp()
    const id = timestamp.toString()
    const newTaskData: TaskData = {
      id,
      name: name.trim()
    }

    log.log(`✚ Add task: "${name}" (id: ${id})`)
    log.debug('addTask state before:', currentState.tasks.length, 'tasks')

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
    if (!name.trim()) {
      log.debug('addAndStartTask rejected: empty name')
      return currentState
    }

    const timestamp = getTimestamp()
    const id = timestamp.toString()

    const newTaskData: TaskData = {
      id,
      name: name.trim()
    }

    log.log(`✚ Add & start task: "${name}" (id: ${id}) at ${timestamp}ms`)
    log.debug('addAndStartTask - current running:', getRunningTaskId(currentState.clickHistory))

    return {
      ...currentState,
      tasks: [...currentState.tasks, newTaskData],
      clickHistory: [...currentState.clickHistory, { taskId: id, timestamp }],
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
    const timestamp = getTimestamp()
    const taskName = currentState.tasks.find(t => t.id === id)?.name || 'unknown'
    const wasPreviouslyRunning = getRunningTaskId(currentState.clickHistory)
    
    log.log(`▶ Start task: "${taskName}" (id: ${id}) at ${timestamp}ms`)
    if (wasPreviouslyRunning !== id) {
      const prevName = currentState.tasks.find(t => t.id === wasPreviouslyRunning)?.name || 'none'
      log.debug(`startTask - switching from "${prevName}" to "${taskName}"`)
    }
    
    return {
      ...currentState,
      clickHistory: [...currentState.clickHistory, { taskId: id, timestamp }],
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
    const oldName = currentState.tasks.find(t => t.id === id)?.name || 'unknown'
    log.log(`✏ Rename task: "${oldName}" → "${name}" (id: ${id})`)
    
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
    const taskName = currentState.tasks.find(t => t.id === id)?.name || 'unknown'
    const clicksRemoved = currentState.clickHistory.filter(e => e.taskId === id).length
    
    log.log(`🗑 Delete task: "${taskName}" (id: ${id}) - removed ${clicksRemoved} click events`)
    
    return {
      ...currentState,
      tasks: currentState.tasks.filter(td => td.id !== id),
      clickHistory: currentState.clickHistory.filter(e => e.taskId !== id),
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
    log.log(`🗑 Delete all tasks - clearing entire state`)
    return {
      tasks: [],
      clickHistory: [],
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
    const tasksCount = currentState.tasks.length
    const clicksCount = currentState.clickHistory.length
    log.log(`⟲ Reset all timers - clearing ${clicksCount} click events for ${tasksCount} tasks`)
    
    return {
      ...currentState,
      clickHistory: [],
      lastModified: getTimestamp()
    }
  },

  /**
   * Pause current running task by removing the last click
   */
  pauseCurrentTask(
    currentState: TaskManagerState,
    getTimestamp: () => number = () => Date.now()
  ): TaskManagerState {
    if (currentState.clickHistory.length === 0) {
      log.debug('pauseCurrentTask: no clicks to remove')
      return currentState
    }
    
    const lastClick = currentState.clickHistory[currentState.clickHistory.length - 1]
    const taskName = currentState.tasks.find(t => t.id === lastClick.taskId)?.name || 'unknown'
    log.log(`⏸ Pause task: "${taskName}" (id: ${lastClick.taskId})`)
    
    return {
      ...currentState,
      clickHistory: currentState.clickHistory.slice(0, -1),
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
    const tasks = convertTaskDataList(state.tasks, state.clickHistory, now)
    log.debug(`getAllTasks: ${tasks.length} tasks, running: ${tasks.filter(t => t.isRunning).map(t => t.name).join(', ') || 'none'}`)
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
    const taskData = state.tasks.find(t => t.id === id)
    if (!taskData) {
      log.debug(`getTask: task not found (id: ${id})`)
      return undefined
    }

    const isRunning = id === getRunningTaskId(state.clickHistory)
    const stats = calculateTaskStats(id, state.clickHistory, now)

    const task = {
      id: taskData.id,
      name: taskData.name,
      isRunning,
      currentSessionTime: isRunning ? stats.currentSessionTime : 0,
      lastSessionTime: !isRunning ? stats.currentSessionTime : 0,
      totalTime: stats.totalTime
    }
    
    log.debug(`getTask: "${taskData.name}" - running: ${isRunning}, total: ${stats.totalTime}s`)
    return task
  },

  /**
   * Get currently running task ID
   */
  getCurrentRunningTaskId(state: TaskManagerState): string | undefined {
    const id = getRunningTaskId(state.clickHistory)
    const taskName = id ? state.tasks.find(t => t.id === id)?.name : 'none'
    log.debug(`getCurrentRunningTaskId: "${taskName}" (id: ${id})`)
    return id
  },

  /**
   * Get total elapsed time across all tasks
   */
  getTotalElapsedTime(
    state: TaskManagerState,
    now: number
  ): number {
    const tasks = this.getAllTasks(state, now)
    const total = tasks.reduce((sum, t) => sum + t.totalTime, 0)
    log.debug(`getTotalElapsedTime: ${total}s across ${tasks.length} tasks`)
    return total
  },

  /**
   * Check if task exists
   */
  taskExists(id: string, state: TaskManagerState): boolean {
    const exists = state.tasks.some(t => t.id === id)
    log.debug(`taskExists: id ${id} - ${exists ? 'found' : 'not found'}`)
    return exists
  }
}
