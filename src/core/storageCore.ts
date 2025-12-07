// Unified core storage logic for ClockTasks
import type { StoredData } from './types'
// Removed custom logger; use console.* with explicit prefixes

const LOG_PREFIX_FILE = '[clock-tasks][StorageCore]'

export const STORAGE_KEY = 'clockTasks'

export function serializeData(data: StoredData): string {
  // Add any future migration/validation logic here
  return JSON.stringify(data)
}

export function deserializeData(raw: string | null): StoredData {
  const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:deserializeData`
  if (!raw) {
    console.debug(LOG_PREFIX_FN, 'No data found, returning empty state')
    return { tasks: [], history: [], lastModified: Date.now(), sortMode: 'total' }
  }
  try {
    const data = JSON.parse(raw)
    return {
      tasks: data.tasks || [],
      history: data.history || [],
      lastModified: data.lastModified || Date.now(),
      sortMode: data.sortMode || 'total'
    }
  } catch (error) {
    console.error(LOG_PREFIX_FN, 'Failed to parse data:', error)
    return { tasks: [], history: [], lastModified: Date.now(), sortMode: 'total' }
  }
}

export function validateData(data: StoredData): StoredData {
  // Add validation/migration logic if needed
  return {
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    history: Array.isArray(data.history) ? data.history : [],
    lastModified: typeof data.lastModified === 'number' ? data.lastModified : Date.now(),
    sortMode: data.sortMode === 'alphabetical' || data.sortMode === 'total' ? data.sortMode : 'total'
  }
}
