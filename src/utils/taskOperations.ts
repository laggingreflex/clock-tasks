import type { TaskData, ClickEvent, StoredData } from '../types'
import { saveToLocalStorage } from './storageHelpers'
import { logger } from './logger'

/**
 * Add a new task and start it immediately
 */
export function addTask(
  name: string,
  taskDataList: TaskData[],
  history: ClickEvent[],
  onTaskAdded: (id: string) => void,
  onSync: (data: StoredData) => Promise<void>
): void {
  if (name.trim()) {
    const id = Date.now().toString()
    const now = Date.now()

    const newTaskData: TaskData = {
      id,
      name: name.trim()
    }
    const newTasks = [...taskDataList, newTaskData]
    const newhistory = [...history, { taskId: id, timestamp: now }]

    syncData(newTasks, newhistory, onSync)
    onTaskAdded(id)
  }
}

/**
 * Start/click a task
 */
export function startTask(
  id: string,
  taskDataList: TaskData[],
  history: ClickEvent[],
  onSync: (data: StoredData) => Promise<void>
): void {
  const now = Date.now()
  logger.log(`Starting task: ${id} at ${now}`)
  logger.debug('Current history:', history)
  const newhistory = [...history, { taskId: id, timestamp: now }]
  logger.debug('New history:', newhistory)
  syncData(taskDataList, newhistory, onSync)
}

/**
 * Update task name
 */
export function updateTaskName(
  id: string,
  name: string,
  taskDataList: TaskData[],
  history: ClickEvent[],
  onSync: (data: StoredData) => Promise<void>
): TaskData[] {
  const updated = taskDataList.map(td => (td.id === id ? { ...td, name } : td))
  syncData(updated, history, onSync)
  return updated
}

/**
 * Delete a single task
 */
export function deleteTask(
  id: string,
  taskDataList: TaskData[],
  history: ClickEvent[],
  onSync: (data: StoredData) => Promise<void>
): { tasks: TaskData[]; history: ClickEvent[] } {
  if (window.confirm('Delete this task?')) {
    const updated = taskDataList.filter(td => td.id !== id)
    // Also remove all click history for this task
    const updatedHistory = history.filter(e => e.taskId !== id)
    syncData(updated, updatedHistory, onSync)
    return { tasks: updated, history: updatedHistory }
  }
  return { tasks: taskDataList, history: history }
}

/**
 * Delete all tasks
 */
export function deleteAllTasks(
  taskDataList: TaskData[],
  history: ClickEvent[],
  onSync: (data: StoredData) => Promise<void>
): { tasks: TaskData[]; history: ClickEvent[] } {
  if (window.confirm('Delete all tasks?')) {
    syncData([], [], onSync)
    return { tasks: [], history: [] }
  }
  return { tasks: taskDataList, history: history }
}

/**
 * Reset all timers
 */
export function resetAllTasks(
  taskDataList: TaskData[],
  onSync: (data: StoredData) => Promise<void>
): void {
  syncData(taskDataList, [], onSync)
}

/**
 * Helper to sync data both locally and to remote
 */
function syncData(
  tasks: TaskData[],
  history: ClickEvent[],
  onSync: (data: StoredData) => Promise<void>
): void {
  const now = Date.now()
  const data: StoredData = {
    tasks,
    history,
    lastModified: now
  }
  saveToLocalStorage(data)
  onSync(data)
}
