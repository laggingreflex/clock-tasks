import { useState, useEffect, useRef } from 'react'
import { loadFromLocalStorage } from '../utils/storageHelpers'
import type { TaskManagerState } from '../core'
import { createLogger } from '../utils/logger'

const log = createLogger('useTaskState')

export const useTaskState = () => {
  const { tasks: initialTasks, clickHistory: initialClickHistory } = loadFromLocalStorage()
  const hasLoggedInit = useRef(false)

  const [state, setState] = useState<TaskManagerState>({
    tasks: initialTasks,
    clickHistory: initialClickHistory,
    lastModified: Date.now()
  })

  useEffect(() => {
    if (!hasLoggedInit.current) {
      log.debug(`useTaskState initialized with ${initialTasks.length} tasks`)
      hasLoggedInit.current = true
    }
  }, [])

  return { state, setState }
}
