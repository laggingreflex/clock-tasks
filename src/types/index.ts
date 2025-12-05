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

export interface User {
  id: string
  email: string
  name: string
  picture: string
  accessToken: string
}
