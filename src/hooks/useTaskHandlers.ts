import { TaskOperations } from '../core'
import type { TaskManagerState } from '../core'
import type { StoredData } from '../types'
import { createLogger } from '../utils/logger'

const log = createLogger('useTaskHandlers')

export const useTaskHandlers = (
  state: TaskManagerState,
  setState: (state: TaskManagerState) => void,
  syncToGoogleDrive: (fileId: string | null, data: StoredData) => Promise<void>,
  driveFileId: string | null,
  setDeletionMode: (mode: boolean) => void,
  setLastAddedTaskId: (id: string | null) => void
) => {
  const updateAndSync = (newState: TaskManagerState) => {
    log.debug('updateAndSync: updating state and syncing to drive')
    setState(newState)
    syncToGoogleDrive(driveFileId, {
      tasks: newState.tasks,
      clickHistory: newState.clickHistory,
      lastModified: newState.lastModified
    }).catch(err => {
      log.error('updateAndSync failed:', err)
    })
  }

  const handleAddTask = (name: string) => {
    log.log(`👤 User action: Add task "${name}"`)
    const newState = TaskOperations.addAndStartTask(name, state)
    updateAndSync(newState)
    setLastAddedTaskId(newState.tasks[newState.tasks.length - 1].id)
  }

  const handleStartTask = (id: string) => {
    const taskName = state.tasks.find(t => t.id === id)?.name || 'unknown'
    log.log(`👤 User action: Click task "${taskName}"`)
    updateAndSync(TaskOperations.startTask(id, state))
  }

  const handleUpdateTaskName = (id: string, name: string) => {
    log.log(`👤 User action: Rename task to "${name}"`)
    updateAndSync(TaskOperations.updateTaskName(id, name, state))
  }

  const handleDeleteTask = (id: string) => {
    const taskName = state.tasks.find(t => t.id === id)?.name || 'unknown'
    log.log(`👤 User action: Delete task "${taskName}" - awaiting confirmation`)
    if (window.confirm('Delete this task?')) {
      log.log(`✓ Delete confirmed for "${taskName}"`)
      updateAndSync(TaskOperations.deleteTask(id, state))
    } else {
      log.debug(`Delete cancelled for "${taskName}"`)
    }
  }

  const handleDeleteAllTasks = () => {
    log.log('👤 User action: Delete all tasks - awaiting confirmation')
    if (window.confirm('Delete all tasks?')) {
      log.log('✓ Delete all confirmed')
      updateAndSync(TaskOperations.deleteAllTasks(state))
      setDeletionMode(false)
    } else {
      log.debug('Delete all cancelled')
    }
  }

  const handleResetAll = () => {
    log.log('👤 User action: Reset all timers')
    updateAndSync(TaskOperations.resetAllTasks(state))
  }

  return {
    handleAddTask,
    handleStartTask,
    handleUpdateTaskName,
    handleDeleteTask,
    handleDeleteAllTasks,
    handleResetAll
  }
}
