/**
 * Storage layer - handles persistence of task data
 * Can be extended to support multiple backends (localStorage, IndexedDB, API, etc.)
 */

import type { StoredData, TaskData, ClickEvent, StorageBackend } from './types'

const STORAGE_KEY = 'clockTasks'

/**
 * LocalStorage implementation of StorageBackend
 */
export class LocalStorageBackend implements StorageBackend {
  async load(): Promise<StoredData> {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) {
      return { tasks: [], clickHistory: [], lastModified: Date.now() }
    }

    try {
      const data = JSON.parse(saved)
      return {
        tasks: data.tasks || [],
        clickHistory: data.clickHistory || [],
        lastModified: data.lastModified || Date.now()
      }
    } catch {
      return { tasks: [], clickHistory: [], lastModified: Date.now() }
    }
  }

  async save(data: StoredData): Promise<void> {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data))
  }

  async clear(): Promise<void> {
    localStorage.removeItem(STORAGE_KEY)
  }
}

/**
 * In-memory implementation of StorageBackend (useful for testing)
 */
export class InMemoryBackend implements StorageBackend {
  private data: StoredData = { tasks: [], clickHistory: [], lastModified: Date.now() }

  async load(): Promise<StoredData> {
    return structuredClone(this.data)
  }

  async save(data: StoredData): Promise<void> {
    this.data = structuredClone(data)
  }

  async clear(): Promise<void> {
    this.data = { tasks: [], clickHistory: [], lastModified: Date.now() }
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
