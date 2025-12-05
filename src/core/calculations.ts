/**
 * Pure calculation functions for task statistics
 * No side effects, no dependencies on storage or UI
 */

import type { ClickEvent, TaskStats, TaskData, Task } from './types'

/**
 * Calculate task statistics from click history
 * Returns current session time, last session time, and total accumulated time
 */
export function calculateTaskStats(
  taskId: string,
  clickHistory: ClickEvent[],
  now: number
): TaskStats {
  const taskClicks = clickHistory.filter(e => e.taskId === taskId)

  if (taskClicks.length === 0) {
    return { currentSessionTime: 0, lastSessionTime: 0, totalTime: 0 }
  }

  let totalTime = 0
  let lastSessionTime = 0
  let currentSessionTime = 0
  let previousSessionDuration = 0

  for (let i = 0; i < taskClicks.length; i++) {
    const clickTime = taskClicks[i].timestamp
    // Find the next click (of any task) in the global history
    const nextClickIndex = clickHistory.findIndex(e => e.timestamp > clickTime)
    const endTime = nextClickIndex !== -1 ? clickHistory[nextClickIndex].timestamp : now

    const sessionDuration = Math.floor((endTime - clickTime) / 1000)
    totalTime += sessionDuration

    // Is this the most recent click of this task?
    if (i === taskClicks.length - 1) {
      currentSessionTime = sessionDuration
      lastSessionTime = previousSessionDuration // Use the previous session's duration
    } else {
      previousSessionDuration = sessionDuration // Save this for the next iteration
    }
  }

  return { currentSessionTime, lastSessionTime, totalTime }
}

/**
 * Get the currently running task (most recent click overall)
 */
export function getCurrentRunningTaskId(clickHistory: ClickEvent[]): string | undefined {
  if (clickHistory.length === 0) return undefined
  return clickHistory[clickHistory.length - 1].taskId
}

/**
 * Calculate total elapsed time across all tasks
 */
export function calculateTotalElapsedTime(tasks: Array<{ totalTime: number }>): number {
  return tasks.reduce((sum, t) => sum + t.totalTime, 0)
}

/**
 * Convert TaskData to display Task with calculated runtime values
 */
export function taskDataToTask(
  taskData: TaskData,
  clickHistory: ClickEvent[],
  now: number
): Task {
  const currentRunningTaskId = getCurrentRunningTaskId(clickHistory)
  const isRunning = taskData.id === currentRunningTaskId
  const stats = calculateTaskStats(taskData.id, clickHistory, now)

  return {
    id: taskData.id,
    name: taskData.name,
    isRunning,
    currentSessionTime: isRunning ? stats.currentSessionTime : 0,
    lastSessionTime: !isRunning && stats.lastSessionTime > 0 ? stats.lastSessionTime : 0,
    totalTime: stats.totalTime
  }
}

/**
 * Convert all task data to display tasks
 */
export function convertTaskDataList(
  taskDataList: TaskData[],
  clickHistory: ClickEvent[],
  now: number
): Task[] {
  return taskDataList.map(td => taskDataToTask(td, clickHistory, now))
}

/**
 * Calculate percentage of time spent on a task relative to total
 */
export function calculateTaskPercentage(taskTotalTime: number, grandTotal: number): string {
  if (grandTotal === 0) return '0'
  return ((taskTotalTime / grandTotal) * 100).toFixed(1)
}
