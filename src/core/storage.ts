/**
 * Storage layer - handles persistence of task data
 * Can be extended to support multiple backends (localStorage, IndexedDB, API, etc.)
 */

import type { StoredData, StorageBackend } from './types'
// Removed custom logger; use console.* with explicit prefixes

const LOG_PREFIX_FILE = '[clock-tasks][Storage]'

// Note: LocalStorage-backed implementations have been moved to
// services/providers/localStorageProvider.ts to keep core free of
// browser-specific details.

/**
 * In-memory implementation of StorageBackend (useful for testing)
 */
export class InMemoryBackend implements StorageBackend {
  private data: StoredData = { tasks: [], history: [], lastModified: Date.now() }

  async load(): Promise<StoredData> {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:load`
    const result = structuredClone(this.data)
    console.debug(LOG_PREFIX_FN, `InMemory load: ${result.tasks.length} tasks, ${result.history.length} clicks`)
    return result
  }

  async save(data: StoredData): Promise<void> {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:save`
    this.data = structuredClone(data)
    console.debug(LOG_PREFIX_FN, `InMemory save: ${data.tasks.length} tasks, ${data.history.length} clicks`)
  }

  async clear(): Promise<void> {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:clear`
    this.data = { tasks: [], history: [], lastModified: Date.now() }
    console.debug(LOG_PREFIX_FN, 'InMemory cleared')
  }
}
