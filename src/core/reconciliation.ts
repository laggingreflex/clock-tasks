/**
 * Three-way merge reconciliation for intelligent sync conflicts
 *
 * Instead of binary "overwrite or discard" choices, this intelligently merges
 * changes from local and server using a baseline reference.
 *
 * Strategy:
 * - Tasks identified by NAME (not timestamp) to allow merging non-overlapping additions
 * - Click history merged chronologically, with deduplication
 * - Only flags true conflicts (same task modified differently on both sides)
 * - Default strategy: local-optimistic (prefer local changes when possible)
 */

import type { StoredData, TaskData } from './types'
import { createLogger } from '@/utils/logger'

const log = createLogger('Reconciliation')

/**
 * Represents a merge conflict that can't be auto-resolved
 */
export interface MergeConflict {
  type: 'task-modified'
  taskName: string
  localVersion: TaskData
  serverVersion: TaskData
}

/**
 * Result of a merge operation
 */
export interface MergeResult {
  data: StoredData
  conflicts: MergeConflict[]
  hasTrueConflicts: boolean
  summary: {
    tasksKept: number
    tasksAdded: number
    tasksRemoved: number
    clicksAdded: number
    clicksRemoved: number
  }
}

/**
 * Three-way merge: intelligently combines local and server changes using baseline
 *
 * @param local - The local data (what user has)
 * @param server - The server data (what's on Google Drive)
 * @param baseline - The last known state before divergence (reference point)
 * @returns Merged data and any unresolvable conflicts
 */
export function reconcile(local: StoredData, server: StoredData, baseline: StoredData | null): MergeResult {
  log.debug('Starting three-way merge reconciliation')
  log.debug(`Local: ${local.tasks.length} tasks, ${local.history.length} clicks`)
  log.debug(`Server: ${server.tasks.length} tasks, ${server.history.length} clicks`)
  if (baseline) {
    log.debug(`Baseline: ${baseline.tasks.length} tasks, ${baseline.history.length} clicks`)
  }

  const base = baseline || { tasks: [], history: [], lastModified: 0 }
  const conflicts: MergeConflict[] = []
  const merged: StoredData = {
    tasks: [],
    history: [],
    lastModified: Date.now()
  }

  // PHASE 1: Merge tasks by name
  const baseTasksByName = new Map(base.tasks.map(t => [t.name, t]))
  const localTasksByName = new Map(local.tasks.map(t => [t.name, t]))
  const serverTasksByName = new Map(server.tasks.map(t => [t.name, t]))

  const allTaskNames = new Set([
    ...baseTasksByName.keys(),
    ...localTasksByName.keys(),
    ...serverTasksByName.keys()
  ])

  const mergedTasksByName = new Map<string, TaskData>()

  for (const taskName of allTaskNames) {
    const baseTask = baseTasksByName.get(taskName)
    const localTask = localTasksByName.get(taskName)
    const serverTask = serverTasksByName.get(taskName)

    const baseExists = baseTask !== undefined
    const localExists = localTask !== undefined
    const serverExists = serverTask !== undefined

    if (!baseExists && localExists && !serverExists) {
      log.debug(`Task added locally: "${taskName}"`)
      mergedTasksByName.set(taskName, localTask!)
    } else if (!baseExists && !localExists && serverExists) {
      log.debug(`Task added on server: "${taskName}"`)
      mergedTasksByName.set(taskName, serverTask!)
    } else if (!baseExists && localExists && serverExists) {
      if (JSON.stringify(localTask) === JSON.stringify(serverTask)) {
        log.debug(`Task added identically on both sides: "${taskName}"`)
        mergedTasksByName.set(taskName, localTask!)
      } else {
        log.warn(`CONFLICT: Task created differently on both sides: "${taskName}"`)
        conflicts.push({
          type: 'task-modified',
          taskName,
          localVersion: localTask!,
          serverVersion: serverTask!
        })
        mergedTasksByName.set(taskName, localTask!)
      }
    } else if (baseExists && localExists && serverExists) {
      if (JSON.stringify(localTask) === JSON.stringify(serverTask)) {
        log.debug(`Task unchanged on both sides: "${taskName}"`)
        mergedTasksByName.set(taskName, localTask!)
      } else if (JSON.stringify(baseTask) === JSON.stringify(serverTask)) {
        log.debug(`Task changed locally, server unchanged: "${taskName}"`)
        mergedTasksByName.set(taskName, localTask!)
      } else if (JSON.stringify(baseTask) === JSON.stringify(localTask)) {
        log.debug(`Task changed on server, local unchanged: "${taskName}"`)
        mergedTasksByName.set(taskName, serverTask!)
      } else {
        log.warn(`CONFLICT: Task modified differently on both sides: "${taskName}"`)
        conflicts.push({
          type: 'task-modified',
          taskName,
          localVersion: localTask!,
          serverVersion: serverTask!
        })
        mergedTasksByName.set(taskName, localTask!)
      }
    } else if (baseExists && !localExists && serverExists) {
      log.debug(`Task deleted locally, keeping deletion: "${taskName}"`)
    } else if (baseExists && localExists && !serverExists) {
      log.debug(`Task deleted on server, keeping deletion: "${taskName}"`)
    } else if (baseExists && !localExists && !serverExists) {
      log.debug(`Task deleted on both sides: "${taskName}"`)
    }
  }

  // PHASE 2: Merge click history
  const clickMap = new Map<string, any>()

  for (const click of [...local.history, ...server.history]) {
    const clickId = `${click.taskId}-${click.timestamp}`
    if (!clickMap.has(clickId)) {
      clickMap.set(clickId, click)
    }
  }

  const mergedHistory = Array.from(clickMap.values()).sort((a, b) => a.timestamp - b.timestamp)

  // PHASE 3: Compute statistics
  const oldTaskCount = local.tasks.length
  const newTaskCount = mergedTasksByName.size
  const oldHistoryCount = local.history.length
  const newHistoryCount = mergedHistory.length

  const summary = {
    tasksKept: mergedTasksByName.size,
    tasksAdded: Math.max(0, newTaskCount - oldTaskCount),
    tasksRemoved: Math.max(0, oldTaskCount - newTaskCount),
    clicksAdded: Math.max(0, newHistoryCount - oldHistoryCount),
    clicksRemoved: Math.max(0, oldHistoryCount - newHistoryCount)
  }

  merged.tasks = Array.from(mergedTasksByName.values())
  merged.history = mergedHistory
  merged.lastModified = Math.max(local.lastModified, server.lastModified, Date.now())

  const hasTrueConflicts = conflicts.length > 0

  log.log(`Merge complete: ${summary.tasksKept} tasks, ${summary.clicksAdded} clicks added from server`)
  if (hasTrueConflicts) {
    log.warn(`${conflicts.length} unresolved conflict(s) detected`)
  }

  return {
    data: merged,
    conflicts,
    hasTrueConflicts,
    summary
  }
}
