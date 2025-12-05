// Unified core storage logic for ClockTasks
import type { StoredData } from './types'
import { createLogger } from '@/utils/logger'

const log = createLogger('StorageCore')

export const STORAGE_KEY = 'clockTasks'

export function serializeData(data: StoredData): string {
  // Add any future migration/validation logic here
  return JSON.stringify(data)
}

export function deserializeData(raw: string | null): StoredData {
  if (!raw) {
    log.debug('No data found, returning empty state')
    return { tasks: [], history: [], lastModified: Date.now() }
  }
  try {
    const data = JSON.parse(raw)
    return {
      tasks: data.tasks || [],
      history: data.history || [],
      lastModified: data.lastModified || Date.now()
    }
  } catch (error) {
    log.error('Failed to parse data:', error)
    return { tasks: [], history: [], lastModified: Date.now() }
  }
}

export function validateData(data: StoredData): StoredData {
  // Add validation/migration logic if needed
  return {
    tasks: Array.isArray(data.tasks) ? data.tasks : [],
    history: Array.isArray(data.history) ? data.history : [],
    lastModified: typeof data.lastModified === 'number' ? data.lastModified : Date.now()
  }
}
