/**
 * Storage layer - handles persistence of task data
 * Can be extended to support multiple backends (localStorage, IndexedDB, API, etc.)
 */

import type { StoredData, StorageBackend } from './types'
import { createLogger } from '@/utils/logger'
import { STORAGE_KEY, serializeData, deserializeData, validateData } from './storageCore'

const log = createLogger('Storage')

/**
 * LocalStorage implementation of StorageBackend
 */
export class LocalStorageBackend implements StorageBackend {

  async load(): Promise<StoredData> {
    const saved = localStorage.getItem(STORAGE_KEY)
    const result = validateData(deserializeData(saved))
    log.log(`📥 LocalStorage load: ${result.tasks.length} tasks, ${result.history.length} clicks`)
    log.debug('LocalStorage load details:', result)
    return result
  }


  async save(data: StoredData): Promise<void> {
    try {
      localStorage.setItem(STORAGE_KEY, serializeData(validateData(data)))
      log.log(`📤 LocalStorage save: ${data.tasks.length} tasks, ${data.history.length} clicks`)
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
  private data: StoredData = { tasks: [], history: [], lastModified: Date.now() }

  async load(): Promise<StoredData> {
    const result = structuredClone(this.data)
    log.debug(`InMemory load: ${result.tasks.length} tasks, ${result.history.length} clicks`)
    return result
  }

  async save(data: StoredData): Promise<void> {
    this.data = structuredClone(data)
    log.debug(`InMemory save: ${data.tasks.length} tasks, ${data.history.length} clicks`)
  }

  async clear(): Promise<void> {
    this.data = { tasks: [], history: [], lastModified: Date.now() }
    log.debug('InMemory cleared')
  }
}

/**
 * Convenience functions for localStorage (kept for backward compatibility)
 */
export function loadFromLocalStorage(): StoredData {
  const saved = localStorage.getItem(STORAGE_KEY)
  return validateData(deserializeData(saved))
}

export function saveToLocalStorage(data: StoredData): void {
  localStorage.setItem(STORAGE_KEY, serializeData(validateData(data)))
}

export function clearLocalStorage(): void {
  localStorage.removeItem(STORAGE_KEY)
}

/**
 * Load sort mode preference from storage
 */
export function loadSortModePreference(): 'total' | 'alphabetical' {
  const data = loadFromLocalStorage()
  return data.sortMode || 'total'
}

/**
 * Save sort mode preference to storage
 */
export function saveSortModePreference(sortMode: 'total' | 'alphabetical'): void {
  const data = loadFromLocalStorage()
  data.sortMode = sortMode
  saveToLocalStorage(data)
}
