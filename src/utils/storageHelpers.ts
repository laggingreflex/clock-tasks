import type { StoredData, TaskData, ClickEvent } from '../types'
import { createLogger } from './logger'

const log = createLogger('StorageHelpers')
const STORAGE_KEY = 'clockTasks'

/**
 * Load tasks and click history from localStorage
 */
export function loadFromLocalStorage(): { tasks: TaskData[]; clickHistory: ClickEvent[] } {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) {
    log.debug('loadFromLocalStorage: no saved data')
    return { tasks: [], clickHistory: [] }
  }

  try {
    const data = JSON.parse(saved)
    const result = {
      tasks: data.tasks || [],
      clickHistory: data.clickHistory || []
    }
    log.debug(`loadFromLocalStorage: ${result.tasks.length} tasks, ${result.clickHistory.length} clicks`)
    return result
  } catch (error) {
    log.error('loadFromLocalStorage failed:', error)
    return { tasks: [], clickHistory: [] }
  }
}

/**
 * Save tasks and click history to localStorage
 */
export function saveToLocalStorage(data: StoredData): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
    log.debug(`saveToLocalStorage: ${data.tasks.length} tasks, ${data.clickHistory.length} clicks`)
  } catch (error) {
    log.error('saveToLocalStorage failed:', error)
  }
}

/**
 * Clear all data from localStorage
 */
export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY)
}
