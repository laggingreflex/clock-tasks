import type { TaskData, ClickEvent, Task } from '../types'
import { calculateTaskStats, getCurrentRunningTaskId } from './taskCalculations'

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
