// Core types are re-exported from core module for convenience
export type { TaskData, ClickEvent, StoredData, Task, TaskStats } from '@/core'

// App-specific types
export interface User {
  id: string
  email: string
  name: string
  picture: string
  accessToken: string
  isGuest?: boolean
}
