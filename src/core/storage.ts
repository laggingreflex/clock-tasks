/**
 * Storage layer - handles persistence of task data
 * Can be extended to support multiple backends (localStorage, IndexedDB, API, etc.)
 */

import type { StoredData, TaskData, ClickEvent, StorageBackend } from './types'
import { createLogger } from '../utils/logger'

const log = createLogger('Storage')
const STORAGE_KEY = 'clockTasks'

/**
 * LocalStorage implementation of StorageBackend
 */
export class LocalStorageBackend implements StorageBackend {
  async load(): Promise<StoredData> {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      log.debug('LocalStorage load: no saved data, returning empty state')
      return { tasks: [], clickHistory: [], lastModified: Date.now() }
    }

    try {
      const data = JSON.parse(saved)
      const result = {
        tasks: data.tasks || [],
        clickHistory: data.clickHistory || [],
        lastModified: data.lastModified || Date.now()
      }
      log.log(`📥 LocalStorage load: ${result.tasks.length} tasks, ${result.clickHistory.length} clicks`)
      log.debug('LocalStorage load details:', result)
      return result
    } catch (error) {
      log.error('LocalStorage load failed:', error)
      return { tasks: [], clickHistory: [], lastModified: Date.now() }
    }
  }

  async save(data: StoredData): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
      log.log(`📤 LocalStorage save: ${data.tasks.length} tasks, ${data.clickHistory.length} clicks`)
      log.debug('LocalStorage save details:', data)
    } catch (error) {
      log.error('LocalStorage save failed:', error)
    }
  }

  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY)
    log.log('📤 LocalStorage cleared')
  }
}

/**
 * In-memory implementation of StorageBackend (useful for testing)
 */
export class InMemoryBackend implements StorageBackend {
  private data: StoredData = { tasks: [], clickHistory: [], lastModified: Date.now() }

  async load(): Promise<StoredData> {
    const result = structuredClone(this.data)
    log.debug(`InMemory load: ${result.tasks.length} tasks, ${result.clickHistory.length} clicks`)
    return result
  }

  async save(data: StoredData): Promise<void> {
    this.data = structuredClone(data)
    log.debug(`InMemory save: ${data.tasks.length} tasks, ${data.clickHistory.length} clicks`)
  }

  async clear(): Promise<void> {
    this.data = { tasks: [], clickHistory: [], lastModified: Date.now() }
    log.debug('InMemory cleared')
  }
}

/**
 * Convenience functions for localStorage (kept for backward compatibility)
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

export function saveToLocalStorage(data: StoredData): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
}

export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY)
}
