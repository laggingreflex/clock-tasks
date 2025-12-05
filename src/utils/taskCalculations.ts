import type { ClickEvent } from '../types'
import { logger } from './logger'

export interface TaskStats {
  currentSessionTime: number
  lastSessionTime: number
  totalTime: number
}

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

  // Find all time intervals for this task (from when it was clicked until next task was clicked)
  let totalTime = 0
  let lastSessionTime = 0
  let currentSessionTime = 0
  let previousSessionDuration = 0

  logger.debug(`Calculating stats for task ${taskId}:`, { taskClicksLength: taskClicks.length, now })

  for (let i = 0; i < taskClicks.length; i++) {
    const clickTime = taskClicks[i].timestamp
    // Find the next click (of any task) in the global history
    const nextClickIndex = clickHistory.findIndex(e => e.timestamp > clickTime)
    const endTime = nextClickIndex !== -1 ? clickHistory[nextClickIndex].timestamp : now

    const sessionDuration = Math.floor((endTime - clickTime) / 1000)
    totalTime += sessionDuration

    logger.debug(`  Click ${i}: clickTime=${clickTime}, endTime=${endTime}, duration=${sessionDuration}s, nextClickIndex=${nextClickIndex}`)

    // Is this the most recent click of this task?
    if (i === taskClicks.length - 1) {
      currentSessionTime = sessionDuration
      lastSessionTime = previousSessionDuration // Use the previous session's duration
    } else {
      previousSessionDuration = sessionDuration // Save this for the next iteration
    }
  }

  logger.debug(`  Final stats: totalTime=${totalTime}s, currentSessionTime=${currentSessionTime}s, lastSessionTime=${lastSessionTime}s`)

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
