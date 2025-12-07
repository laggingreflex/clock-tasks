import type { StoredData, StorageBackend } from '@/core'
import { createLogger } from '@/utils/logger'
import { STORAGE_KEY, serializeData, deserializeData, validateData } from '@/core/storageCore'

const log = createLogger('LocalStorageProvider')

/**
 * LocalStorage implementation of StorageBackend
 * Provider-level to keep core free of browser details
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
    log.log('🗑️ LocalStorage cleared')
  }
}

/** Convenience functions for localStorage usage (guest mode, UI prefs) */
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

export function loadSortModePreference(): 'total' | 'alphabetical' {
  const data = loadFromLocalStorage()
  return data.sortMode || 'total'
}

export function saveSortModePreference(sortMode: 'total' | 'alphabetical'): void {
  const data = loadFromLocalStorage()
  data.sortMode = sortMode
  saveToLocalStorage(data)
}
