import { useMemo } from 'react'
import { TaskQueries } from '@/core'
import type { TaskManagerState } from '@/core'

export const useSortedTasks = (state: TaskManagerState, now: number, sortMode: 'total' | 'alphabetical') => {
  return useMemo(() => {
    const tasks = [...TaskQueries.getAllTasks(state, now)]
    return sortMode === 'alphabetical'
      ? tasks.sort((a, b) => a.name.localeCompare(b.name))
      : tasks.sort((a, b) => b.totalTime - a.totalTime)
  }, [state, now, sortMode])
}
