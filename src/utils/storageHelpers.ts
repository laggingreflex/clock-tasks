import type { StoredData, TaskData, ClickEvent } from '../types'

const STORAGE_KEY = 'clockTasks'

/**
 * Load tasks and click history from localStorage
 */
export function loadFromLocalStorage(): { tasks: TaskData[]; clickHistory: ClickEvent[] } {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (!saved) {
    return { tasks: [], clickHistory: [] }
  }

  try {
    const data = JSON.parse(saved)
    return {
      tasks: data.tasks || [],
      clickHistory: data.clickHistory || []
    }
  } catch {
    return { tasks: [], clickHistory: [] }
  }
}

/**
 * Save tasks and click history to localStorage
 */
export function saveToLocalStorage(data: StoredData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

/**
 * Clear all data from localStorage
 */
export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY)
}
