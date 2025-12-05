import { useState } from 'react'
import { loadFromLocalStorage } from '../utils/storageHelpers'
import type { TaskManagerState } from '../core'

export const useTaskState = () => {
  const { tasks: initialTasks, clickHistory: initialClickHistory } = loadFromLocalStorage()
  const [state, setState] = useState<TaskManagerState>({
    tasks: initialTasks,
    clickHistory: initialClickHistory,
    lastModified: Date.now()
  })
  return { state, setState }
}
