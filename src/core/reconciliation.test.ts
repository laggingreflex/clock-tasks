/**
 * Tests for the reconciliation module
 */

import { describe, it, expect } from 'vitest'
import { reconcile } from './reconciliation'
import type { StoredData } from './types'

describe('Reconciliation', () => {
  const createTestData = (tasks: Array<{ id: string; name: string }>, clicks: Array<{ taskId: string; timestamp: number }> = []): StoredData => ({
    tasks,
    history: clicks,
    lastModified: Date.now()
  })

  it('should keep local-only additions', () => {
    const baseline = createTestData([])
    const local = createTestData([{ id: '1', name: 'Task A' }])
    const server = createTestData([])

    const result = reconcile(local, server, baseline)

    expect(result.data.tasks).toHaveLength(1)
    expect(result.data.tasks[0].name).toBe('Task A')
    expect(result.conflicts).toHaveLength(0)
    expect(result.hasTrueConflicts).toBe(false)
  })

  it('should keep server-only additions', () => {
    const baseline = createTestData([])
    const local = createTestData([])
    const server = createTestData([{ id: '2', name: 'Task B' }])

    const result = reconcile(local, server, baseline)

    expect(result.data.tasks).toHaveLength(1)
    expect(result.data.tasks[0].name).toBe('Task B')
    expect(result.conflicts).toHaveLength(0)
    expect(result.hasTrueConflicts).toBe(false)
  })

  it('should merge non-overlapping additions from both sides', () => {
    const baseline = createTestData([])
    const local = createTestData([{ id: '1', name: 'Task A' }])
    const server = createTestData([{ id: '2', name: 'Task B' }])

    const result = reconcile(local, server, baseline)

    expect(result.data.tasks).toHaveLength(2)
    expect(result.data.tasks.map((t: any) => t.name).sort()).toEqual(['Task A', 'Task B'])
    expect(result.conflicts).toHaveLength(0)
    expect(result.hasTrueConflicts).toBe(false)
  })

  it('should respect local deletion over server changes', () => {
    const baseline = createTestData([{ id: '1', name: 'Task A' }])
    const local = createTestData([]) // Deleted
    const server = createTestData([{ id: '1', name: 'Task A Updated' }]) // Server changed it

    const result = reconcile(local, server, baseline)

    expect(result.data.tasks).toHaveLength(0)
    expect(result.conflicts).toHaveLength(0)
  })

  it('should respect server deletion over local changes', () => {
    const baseline = createTestData([{ id: '1', name: 'Task A' }])
    const local = createTestData([{ id: '1', name: 'Task A Updated' }]) // Local changed it
    const server = createTestData([]) // Deleted

    const result = reconcile(local, server, baseline)

    expect(result.data.tasks).toHaveLength(0)
    expect(result.conflicts).toHaveLength(0)
  })

  it('should flag conflicts when task modified differently on both sides', () => {
    const baseline = createTestData([{ id: '1', name: 'Task A' }])
    const local = createTestData([{ id: '1', name: 'Task A - Local' }])
    const server = createTestData([{ id: '1', name: 'Task A - Server' }])

    const result = reconcile(local, server, baseline)

    expect(result.conflicts).toHaveLength(1)
    expect(result.hasTrueConflicts).toBe(true)
    expect(result.conflicts[0].taskName).toBe('Task A')
    // Should default to local version
    expect(result.data.tasks[0].name).toBe('Task A - Local')
  })

  it('should merge history from both sides chronologically', () => {
    const baseline = createTestData(
      [{ id: '1', name: 'Task A' }],
      []
    )
    const local = createTestData(
      [{ id: '1', name: 'Task A' }],
      [{ taskId: '1', timestamp: 1000 }, { taskId: '1', timestamp: 3000 }]
    )
    const server = createTestData(
      [{ id: '1', name: 'Task A' }],
      [{ taskId: '1', timestamp: 2000 }, { taskId: '1', timestamp: 4000 }]
    )

    const result = reconcile(local, server, baseline)

    expect(result.data.history).toHaveLength(4)
    expect(result.data.history.map((h: any) => h.timestamp)).toEqual([1000, 2000, 3000, 4000])
  })

  it('should deduplicate identical history events', () => {
    const baseline = createTestData(
      [{ id: '1', name: 'Task A' }],
      [{ taskId: '1', timestamp: 1000 }]
    )
    const local = createTestData(
      [{ id: '1', name: 'Task A' }],
      [{ taskId: '1', timestamp: 1000 }, { taskId: '1', timestamp: 2000 }]
    )
    const server = createTestData(
      [{ id: '1', name: 'Task A' }],
      [{ taskId: '1', timestamp: 1000 }, { taskId: '1', timestamp: 3000 }]
    )

    const result = reconcile(local, server, baseline)

    expect(result.data.history).toHaveLength(3)
    expect(result.data.history.map((h: any) => h.timestamp)).toEqual([1000, 2000, 3000])
  })

  it('should work with null baseline (first sync)', () => {
    const local = createTestData([{ id: '1', name: 'Task A' }])
    const server = createTestData([{ id: '2', name: 'Task B' }])

    const result = reconcile(local, server, null)

    expect(result.data.tasks).toHaveLength(2)
    expect(result.conflicts).toHaveLength(0)
  })

  it('should handle complex multi-task scenario', () => {
    const baseline = createTestData([
      { id: '1', name: 'Task A' },
      { id: '2', name: 'Task B' },
      { id: '3', name: 'Task C' }
    ])
    const local = createTestData([
      { id: '1', name: 'Task A' }, // unchanged
      { id: '2', name: 'Task B Updated' }, // changed locally
      // Task C deleted locally
      { id: '4', name: 'Task D' } // added locally
    ])
    const server = createTestData([
      { id: '1', name: 'Task A' }, // unchanged
      { id: '2', name: 'Task B' }, // unchanged (local changed it)
      { id: '3', name: 'Task C' }, // unchanged (local deleted it)
      { id: '5', name: 'Task E' } // added on server
    ])

    const result = reconcile(local, server, baseline)

    // Should have: A (unchanged), B (local change), D (local add), E (server add)
    // Should NOT have: C (local deletion respected)
    expect(result.data.tasks).toHaveLength(4)
    const taskNames = result.data.tasks.map((t: any) => t.name).sort()
    expect(taskNames).toEqual(['Task A', 'Task B Updated', 'Task D', 'Task E'])
    expect(result.conflicts).toHaveLength(0)
  })
})
