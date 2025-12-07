import { TaskOperations, TaskQueries } from '@/core'
import type { TaskManagerState, StoredData } from '@/core'
// Removed custom logger; use console.* with explicit prefixes
import { useAppOptions } from './OptionsContext'

const LOG_PREFIX_FILE = '[clock-tasks][useTaskHandlers]'

export const useTaskHandlers = (
  state: TaskManagerState,
  setState: (state: TaskManagerState) => void,
  syncToGoogleDrive: (fileId: string | null, data: StoredData) => Promise<void>,
  driveFileId: string | null,
  setDeletionMode: (mode: boolean) => void,
  setLastAddedTaskId: (id: string | null) => void
) => {
  const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:useTaskHandlers`
  // Read global options
  const { readOnly } = useAppOptions()
  const updateAndSync = (newState: TaskManagerState) => {
    console.debug(LOG_PREFIX_FN, 'updateAndSync: updating state and syncing to drive')
    setState(newState)
    syncToGoogleDrive(driveFileId, {
      tasks: newState.tasks,
      history: newState.history,
      lastModified: newState.lastModified
    }).catch(err => {
      console.error(LOG_PREFIX_FN, 'updateAndSync failed:', err)
    })
  }

  const handleAddTask = (name: string) => {
    if (readOnly) {
      console.debug(LOG_PREFIX_FN, 'Read-only mode: ignoring add task')
      return
    }
    console.log(LOG_PREFIX_FN, `👤 User action: Add task "${name}"`)
    const newState = TaskOperations.addAndStartTask(name, state)
    updateAndSync(newState)
    setLastAddedTaskId(newState.tasks[newState.tasks.length - 1].id)
  }

  const handleStartTask = (id: string) => {
    if (readOnly) {
      console.debug(LOG_PREFIX_FN, 'Read-only mode: ignoring start task')
      return
    }
    const taskName = state.tasks.find(t => t.id === id)?.name || 'unknown'
    const currentRunningId = TaskQueries.getCurrentRunningTaskId(state)

    // Don't restart a task that's already running
    if (currentRunningId === id) {
      console.debug(LOG_PREFIX_FN, `👤 User action: Click on already running task "${taskName}" - ignoring`)
      return
    }

    console.log(LOG_PREFIX_FN, `👤 User action: Click task "${taskName}"`)
    updateAndSync(TaskOperations.startTask(id, state))
  }

  const handleUpdateTaskName = (id: string, name: string) => {
    if (readOnly) {
      console.debug(LOG_PREFIX_FN, 'Read-only mode: ignoring update task name')
      return
    }
    console.log(LOG_PREFIX_FN, `👤 User action: Rename task to "${name}"`)
    updateAndSync(TaskOperations.updateTaskName(id, name, state))
  }

  const handleDeleteTask = (id: string) => {
    if (readOnly) {
      console.debug(LOG_PREFIX_FN, 'Read-only mode: ignoring delete task')
      return
    }
    const taskName = state.tasks.find(t => t.id === id)?.name || 'unknown'
    console.log(LOG_PREFIX_FN, `👤 User action: Delete task "${taskName}" - awaiting confirmation`)
    if (window.confirm('Delete this task?')) {
      console.log(LOG_PREFIX_FN, `✓ Delete confirmed for "${taskName}"`)
      updateAndSync(TaskOperations.deleteTask(id, state))
    } else {
      console.debug(LOG_PREFIX_FN, `Delete cancelled for "${taskName}"`)
    }
  }

  const handleDeleteAllTasks = () => {
    if (readOnly) {
      console.debug(LOG_PREFIX_FN, 'Read-only mode: ignoring delete all tasks')
      return
    }
    console.log(LOG_PREFIX_FN, '👤 User action: Delete all tasks - awaiting confirmation')
    if (window.confirm('Delete all tasks?')) {
      console.log(LOG_PREFIX_FN, '✓ Delete all confirmed')
      updateAndSync(TaskOperations.deleteAllTasks(state))
      setDeletionMode(false)
    } else {
      console.debug(LOG_PREFIX_FN, 'Delete all cancelled')
    }
  }

  const handleResetAll = () => {
    if (readOnly) {
      console.debug(LOG_PREFIX_FN, 'Read-only mode: ignoring reset all')
      return
    }
    console.log(LOG_PREFIX_FN, '👤 User action: Reset all timers')
    updateAndSync(TaskOperations.resetAllTasks(state))
  }

  const handleStopAll = () => {
    if (readOnly) {
      console.debug(LOG_PREFIX_FN, 'Read-only mode: ignoring stop all')
      return
    }
    console.log(LOG_PREFIX_FN, '👤 User action: Stop all tasks')
    updateAndSync(TaskOperations.stopAllTasks(state))
  }

  return {
    handleAddTask,
    handleStartTask,
    handleUpdateTaskName,
    handleDeleteTask,
    handleDeleteAllTasks,
    handleResetAll,
    handleStopAll
  }
}
