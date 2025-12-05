/**
 * Core data types for the task tracking system
 * These types are framework-agnostic and can be used in any UI
 */

export interface TaskData {
  id: string
  name: string
}

export interface ClickEvent {
  taskId: string
  timestamp: number // Unix timestamp when task was clicked
}

export interface StoredData {
  tasks: TaskData[]
  clickHistory: ClickEvent[] // Chronological list of all task clicks
  lastModified: number
}

export interface Task {
  id: string
  name: string
  isRunning: boolean
  currentSessionTime: number
  lastSessionTime: number
  totalTime: number
}

export interface TaskStats {
  currentSessionTime: number
  lastSessionTime: number
  totalTime: number
}

export interface StorageBackend {
  load(): Promise<StoredData>
  save(data: StoredData): Promise<void>
  clear(): Promise<void>
}
