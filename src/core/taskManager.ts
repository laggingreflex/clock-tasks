/**
 * Core task management logic
 * All business operations for managing tasks, independent of UI framework
 */

import type { TaskData, ClickEvent, StoredData, Task } from './types'
import { calculateTaskStats, getCurrentRunningTaskId as getRunningTaskId, convertTaskDataList } from './calculations'

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
    if (!name.trim()) return currentState

    const timestamp = getTimestamp()
    const id = timestamp.toString()
    const newTaskData: TaskData = {
      id,
      name: name.trim()
    }

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
    if (!name.trim()) return currentState

    const timestamp = getTimestamp()
    const id = timestamp.toString()

    const newTaskData: TaskData = {
      id,
      name: name.trim()
    }

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
    if (currentState.clickHistory.length === 0) return currentState
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
    return convertTaskDataList(state.tasks, state.clickHistory, now)
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
    if (!taskData) return undefined

    const isRunning = id === getRunningTaskId(state.clickHistory)
    const stats = calculateTaskStats(id, state.clickHistory, now)

    return {
      id: taskData.id,
      name: taskData.name,
      isRunning,
      currentSessionTime: isRunning ? stats.currentSessionTime : 0,
      lastSessionTime: !isRunning && stats.lastSessionTime > 0 ? stats.lastSessionTime : 0,
      totalTime: stats.totalTime
    }
  },

  /**
   * Get currently running task ID
   */
  getCurrentRunningTaskId(state: TaskManagerState): string | undefined {
    return getRunningTaskId(state.clickHistory)
  },

  /**
   * Get total elapsed time across all tasks
   */
  getTotalElapsedTime(
    state: TaskManagerState,
    now: number
  ): number {
    const tasks = this.getAllTasks(state, now)
    return tasks.reduce((sum, t) => sum + t.totalTime, 0)
  },

  /**
   * Check if task exists
   */
  taskExists(id: string, state: TaskManagerState): boolean {
    return state.tasks.some(t => t.id === id)
  }
}
