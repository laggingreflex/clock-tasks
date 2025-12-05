import { TaskOperations } from '../core'
import type { TaskManagerState } from '../core'
import type { StoredData } from '../types'

export const useTaskHandlers = (
  state: TaskManagerState,
  setState: (state: TaskManagerState) => void,
  syncToGoogleDrive: (fileId: string | null, data: StoredData) => Promise<void>,
  driveFileId: string | null,
  setDeletionMode: (mode: boolean) => void,
  setLastAddedTaskId: (id: string | null) => void
) => {
  const updateAndSync = (newState: TaskManagerState) => {
    setState(newState)
    syncToGoogleDrive(driveFileId, {
      tasks: newState.tasks,
      clickHistory: newState.clickHistory,
      lastModified: newState.lastModified
    })
  }

  const handleAddTask = (name: string) => {
    const newState = TaskOperations.addAndStartTask(name, state)
    updateAndSync(newState)
    setLastAddedTaskId(newState.tasks[newState.tasks.length - 1].id)
  }

  const handleStartTask = (id: string) => {
    updateAndSync(TaskOperations.startTask(id, state))
  }

  const handleUpdateTaskName = (id: string, name: string) => {
    updateAndSync(TaskOperations.updateTaskName(id, name, state))
  }

  const handleDeleteTask = (id: string) => {
    if (window.confirm('Delete this task?')) {
      updateAndSync(TaskOperations.deleteTask(id, state))
    }
  }

  const handleDeleteAllTasks = () => {
    if (window.confirm('Delete all tasks?')) {
      updateAndSync(TaskOperations.deleteAllTasks(state))
      setDeletionMode(false)
    }
  }

  const handleResetAll = () => {
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
