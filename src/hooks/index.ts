import { useEffect } from 'react'

/**
 * Hook to handle click outside for modals/menus
 */
export function useClickOutside(
  isOpen: boolean,
  onClose: () => void,
  selectorId: string
) {
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (isOpen && !(e.target as HTMLElement).closest(selectorId)) {
        onClose()
      }
    }
    document.addEventListener('click', handleClickOutside)
    return () => document.removeEventListener('click', handleClickOutside)
  }, [isOpen, onClose, selectorId])
}

/**
 * Hook to update document title with formatted time
 */
export function useDocumentTitle(title: string) {
  useEffect(() => {
    document.title = title
  }, [title])
}

/**
 * Hook to scroll newly added task into view
 */
export function useScrollToNewTask(taskId: string | null, onScrollDone: () => void) {
  useEffect(() => {
    if (taskId) {
      const element = document.getElementById(`task-${taskId}`)
      if (element) {
        element.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
      }
      onScrollDone()
    }
  }, [taskId, onScrollDone])
}

/**
 * Hook to update current time periodically
 */
export function useCurrentTime(onTimeUpdate: (now: number) => void) {
  useEffect(() => {
    const interval = setInterval(() => {
      onTimeUpdate(Date.now())
    }, 1000)
    return () => clearInterval(interval)
  }, [onTimeUpdate])
}

/**
 * Hook to handle sorting tasks
 */
export function useSortedTasks(
  tasks: Array<{ id: string; name: string; totalTime: number }>,
  sortMode: 'total' | 'alphabetical'
) {
  return tasks.slice().sort((a, b) => {
    if (sortMode === 'total') {
      return b.totalTime - a.totalTime
    } else if (sortMode === 'alphabetical') {
      return a.name.localeCompare(b.name)
    }
    return 0
  })
}
