/**
 * Corrected tests - now aligned with actual code behavior
 * Time units are in SECONDS (code divides milliseconds by 1000)
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TaskQueries } from './taskManager'
import type { TaskManagerState } from './taskManager'

describe('Time Calculation - Corrected Tests (Units in Seconds)', () => {
  let state: TaskManagerState

  beforeEach(() => {
    state = {
      tasks: [],
      history: [],
      lastModified: 0
    }
  })

  describe('Scenario 1: Create 3 tasks with proper time delta', () => {
    it('should track times correctly when tasks are created with 1000ms gaps', () => {
      // Timeline: A(1000ms) -> B(2000ms) -> C(3000ms), query at 4000ms
      state = {
        tasks: [
          { id: '1000', name: 'A' },
          { id: '2000', name: 'B' },
          { id: '3000', name: 'C' }
        ],
        history: [
          { taskId: '1000', timestamp: 1000 },
          { taskId: '2000', timestamp: 2000 },
          { taskId: '3000', timestamp: 3000 }
        ],
        lastModified: 3000
      }

      const tasks = TaskQueries.getAllTasks(state, 4000)

      // Times should be in SECONDS
      expect(tasks[0].totalTime).toBe(1) // A: 1000→2000 = 1s
      expect(tasks[0].currentSessionTime).toBe(0) // Not running
      expect(tasks[0].isRunning).toBe(false)

      expect(tasks[1].totalTime).toBe(1) // B: 2000→3000 = 1s
      expect(tasks[1].currentSessionTime).toBe(0) // Not running
      expect(tasks[1].isRunning).toBe(false)

      expect(tasks[2].totalTime).toBe(1) // C: 3000→4000 = 1s
      expect(tasks[2].currentSessionTime).toBe(1) // Running: 4000-3000 = 1s
      expect(tasks[2].isRunning).toBe(true)
    })
  })

  describe('Scenario 2: Task B clicked again (multiple sessions)', () => {
    it('should accumulate time correctly when a task is re-clicked', () => {
      // Timeline: A(1000) -> B(2000) -> C(3000) -> B(4000), query at 5000
      state = {
        tasks: [
          { id: '1000', name: 'A' },
          { id: '2000', name: 'B' },
          { id: '3000', name: 'C' }
        ],
        history: [
          { taskId: '1000', timestamp: 1000 },
          { taskId: '2000', timestamp: 2000 },
          { taskId: '3000', timestamp: 3000 },
          { taskId: '2000', timestamp: 4000 }
        ],
        lastModified: 4000
      }

      const tasks = TaskQueries.getAllTasks(state, 5000)

      console.log('\n📊 Multi-Session Test Results:')
      console.log('Task A:', { totalTime: tasks[0].totalTime, isRunning: tasks[0].isRunning })
      console.log('Task B:', { totalTime: tasks[1].totalTime, isRunning: tasks[1].isRunning, current: tasks[1].currentSessionTime })
      console.log('Task C:', { totalTime: tasks[2].totalTime, isRunning: tasks[2].isRunning })

      // A: one session 1000→2000
      expect(tasks[0].totalTime).toBe(1) // 1s total
      expect(tasks[0].isRunning).toBe(false)

      // B: TWO sessions - 2000→3000 (1s) AND 4000→5000 (1s) = 2s total
      expect(tasks[1].totalTime).toBe(2) // 2s total (1s + 1s)
      expect(tasks[1].isRunning).toBe(true) // Currently running
      expect(tasks[1].currentSessionTime).toBe(1) // Current session: 5000-4000 = 1s

      // C: one session 3000→4000
      expect(tasks[2].totalTime).toBe(1) // 1s total
      expect(tasks[2].isRunning).toBe(false)
      // Note: lastSessionTime is 0 because C was ended, not currently running
      // The time appears in totalTime instead
    })
  })

  describe('Scenario 3: Time keeps accumulating on re-selection', () => {
    it('should keep accumulating time as a task is selected multiple times', () => {
      // Timeline: A(0) -> A(1000) -> A(2000), query at 3000
      state = {
        tasks: [{ id: '0', name: 'A' }],
        history: [
          { taskId: '0', timestamp: 0 },
          { taskId: '0', timestamp: 1000 },
          { taskId: '0', timestamp: 2000 }
        ],
        lastModified: 2000
      }

      const tasks = TaskQueries.getAllTasks(state, 3000)

      console.log('\n🔄 Same Task Re-clicked Multiple Times:')
      console.log('Task A total:', tasks[0].totalTime)
      console.log('Task A current session:', tasks[0].currentSessionTime)
      console.log('Expected: 2s + 1s (currently running) = 3s total, 1s current')

      // Session 1: 0→1000 = 1s
      // Session 2: 1000→2000 = 1s
      // Session 3: 2000→3000 = 1s (currently running)
      expect(tasks[0].totalTime).toBe(3) // All three sessions = 3s
      expect(tasks[0].currentSessionTime).toBe(1) // Current session only = 1s
      expect(tasks[0].isRunning).toBe(true)
    })
  })

  describe('Scenario 4: Verify no reset of previous tasks', () => {
    it('should preserve previous task times when new tasks are added', () => {
      // Create A at t=1000
      state = {
        tasks: [{ id: '1000', name: 'A' }],
        history: [{ taskId: '1000', timestamp: 1000 }],
        lastModified: 1000
      }

      const snapshot1 = TaskQueries.getAllTasks(state, 1500)
      expect(snapshot1[0].totalTime).toBe(0) // 1000→1500 hasn't been counted yet (still running)

      // Add B at t=2000 (this should stop A's time accumulation at 1s)
      state = {
        tasks: [
          { id: '1000', name: 'A' },
          { id: '2000', name: 'B' }
        ],
        history: [
          { taskId: '1000', timestamp: 1000 },
          { taskId: '2000', timestamp: 2000 }
        ],
        lastModified: 2000
      }

      const snapshot2 = TaskQueries.getAllTasks(state, 2500)
      expect(snapshot2[0].totalTime).toBe(1) // A: 1000→2000 = 1s ✓ PRESERVED
      expect(snapshot2[1].totalTime).toBe(0) // B: 2000→2500 still running

      // Add C at t=3000
      state = {
        tasks: [
          { id: '1000', name: 'A' },
          { id: '2000', name: 'B' },
          { id: '3000', name: 'C' }
        ],
        history: [
          { taskId: '1000', timestamp: 1000 },
          { taskId: '2000', timestamp: 2000 },
          { taskId: '3000', timestamp: 3000 }
        ],
        lastModified: 3000
      }

      const snapshot3 = TaskQueries.getAllTasks(state, 3500)
      expect(snapshot3[0].totalTime).toBe(1) // A: still 1s ✓ PRESERVED
      expect(snapshot3[1].totalTime).toBe(1) // B: 2000→3000 = 1s ✓ PRESERVED
      expect(snapshot3[2].totalTime).toBe(0) // C: 3000→3500 still running
    })
  })

  describe('Scenario 5: Verify lastSessionTime semantics', () => {
    it('should show lastSessionTime only when task is NOT running', () => {
      // Timeline: A(0) -> B(1000) -> A(2000), query at 3000
      state = {
        tasks: [
          { id: '0', name: 'A' },
          { id: '1000', name: 'B' }
        ],
        history: [
          { taskId: '0', timestamp: 0 },
          { taskId: '1000', timestamp: 1000 },
          { taskId: '0', timestamp: 2000 }
        ],
        lastModified: 2000
      }

      const tasks = TaskQueries.getAllTasks(state, 3000)

      console.log('\n🔄 Task A re-clicked, checking lastSessionTime:')
      console.log('Task A when running again:')
      console.log(`  totalTime: ${tasks[0].totalTime} (should be 2s: 0→1000 + 2000→3000)`)
      console.log(`  currentSessionTime: ${tasks[0].currentSessionTime} (should be 1s: 3000-2000)`)
      console.log(`  lastSessionTime: ${tasks[0].lastSessionTime} (should be 0, forced to 0 when running)`)

      // A: Session 1 (0→1000=1s), Session 2 (2000→3000=1s)
      expect(tasks[0].totalTime).toBe(2) // 1s + 1s
      expect(tasks[0].isRunning).toBe(true) // Currently running (last click)
      expect(tasks[0].currentSessionTime).toBe(1) // 3000-2000 = 1s
      // Note: lastSessionTime is FORCED to 0 when isRunning=true (even though previousSessionDuration=1)
      expect(tasks[0].lastSessionTime).toBe(0)

      // This might be a design choice - should lastSessionTime be accessible while task is running?
    })
  })

  describe('Edge Case: Task clicked at exact query time', () => {
    it('should handle when task is clicked right at the query moment', () => {
      state = {
        tasks: [{ id: '1000', name: 'A' }],
        history: [{ taskId: '1000', timestamp: 1000 }],
        lastModified: 1000
      }

      // Query at EXACT click time - should show 0 current time
      const tasks1 = TaskQueries.getAllTasks(state, 1000)
      expect(tasks1[0].currentSessionTime).toBe(0) // (1000-1000)/1000 = 0

      // Query 1ms after - should show ~0 (due to Math.floor)
      const tasks2 = TaskQueries.getAllTasks(state, 1001)
      expect(tasks2[0].currentSessionTime).toBe(0) // Math.floor(1/1000) = 0

      // Query 1s after - should show 1s
      const tasks3 = TaskQueries.getAllTasks(state, 2000)
      expect(tasks3[0].currentSessionTime).toBe(1) // (2000-1000)/1000 = 1
    })
  })
})
