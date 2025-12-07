import { useState, useEffect, useRef } from 'react'
import { loadFromLocalStorage } from '@/utils/storageHelpers'
import type { TaskManagerState } from '@/core'

// Removed custom logger; use console.* with explicit prefixes
const LOG_PREFIX_FILE = '[clock-tasks][useTaskState]'

export const useTaskState = () => {
  const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:useTaskState`
  const { tasks: initialTasks, history: initialhistory } = loadFromLocalStorage()
  const hasLoggedInit = useRef(false)

  // Load from localStorage synchronously for instant UI responsiveness
  // This is provisional state until Firebase loads and overrides it
  const [state, setState] = useState<TaskManagerState>({
    tasks: initialTasks,
    history: initialhistory,
    lastModified: Date.now()
  })

  useEffect(() => {
    if (!hasLoggedInit.current) {
      console.log(LOG_PREFIX_FN, `📱 useTaskState initialized from localStorage: ${initialTasks.length} tasks (provisional, awaiting Firebase)`)
      hasLoggedInit.current = true
    }
  }, [])

  return { state, setState }
}
