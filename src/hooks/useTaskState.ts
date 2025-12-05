import { useState, useEffect, useRef } from 'react'
import { loadFromLocalStorage } from '@/utils/storageHelpers'
import type { TaskManagerState } from '@/core'
import { createLogger } from '@/utils/logger'

const log = createLogger('useTaskState')

export const useTaskState = () => {
  const { tasks: initialTasks, history: initialhistory } = loadFromLocalStorage()
  const hasLoggedInit = useRef(false)

  // Load from localStorage synchronously for instant UI responsiveness
  // This is provisional state until Google Drive loads and overrides it
  const [state, setState] = useState<TaskManagerState>({
    tasks: initialTasks,
    history: initialhistory,
    lastModified: Date.now()
  })

  useEffect(() => {
    if (!hasLoggedInit.current) {
      log.log(`📱 useTaskState initialized from localStorage: ${initialTasks.length} tasks (provisional, awaiting Google Drive)`)
      hasLoggedInit.current = true
    }
  }, [])

  return { state, setState }
}
