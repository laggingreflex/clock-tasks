import { useState } from 'react'
import { loadFromLocalStorage } from '../utils/storageHelpers'
import type { TaskManagerState } from '../core'
import { createLogger } from '../utils/logger'

const log = createLogger('useTaskState')

export const useTaskState = () => {
  const { tasks: initialTasks, clickHistory: initialClickHistory } = loadFromLocalStorage()
  log.log(`📍 useTaskState initialized: ${initialTasks.length} tasks, ${initialClickHistory.length} clicks`)

  const [state, setState] = useState<TaskManagerState>({
    tasks: initialTasks,
    clickHistory: initialClickHistory,
    lastModified: Date.now()
  })

  return { state, setState }
}
