/**
 * Storage layer - handles persistence of task data
 * Can be extended to support multiple backends (localStorage, IndexedDB, API, etc.)
 */

import type { StoredData, StorageBackend } from './types'
import { createLogger } from '@/utils/logger'

const log = createLogger('Storage')

// Note: LocalStorage-backed implementations have been moved to
// services/providers/localStorageProvider.ts to keep core free of
// browser-specific details.

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
