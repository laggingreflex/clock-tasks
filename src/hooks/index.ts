import { useEffect } from 'react'
export { useTaskState } from './useTaskState'
export { useUIState } from './useUIState'
export { useSyncEffect } from './useSyncEffect'
export { useTaskHandlers } from './useTaskHandlers'
export { useSortedTasks } from './useSortedTasks'

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
