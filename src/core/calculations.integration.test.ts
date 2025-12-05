/**
 * Integration tests to expose logic bugs in time calculation
 * 
 * Scenario: Create 3 tasks (A, B, C) in sequence, then re-select task B
 * This exposes issues with how currentSessionTime and lastSessionTime are calculated
 */

import { describe, it, expect, beforeEach } from 'vitest'
import { TaskOperations, TaskQueries } from './taskManager'
import type { TaskManagerState } from './taskManager'

describe('Time Calculation Logic Bug Hunt', () => {
  let state: TaskManagerState
  let currentTime: number

  beforeEach(() => {
    state = {
      tasks: [],
      clickHistory: [],
      lastModified: 0
    }
    currentTime = 1000 // Start at t=1000ms
  })

  /**
   * Helper to create a controlled timestamp generator
   * This allows us to control exact times for each action
   */
  function createTimeController(startTime: number) {
    let time = startTime
    return {
      tick: (delta: number = 1000) => {
        time += delta
        return time
      },
      now: () => time,
      reset: (newTime: number) => {
        time = newTime
      },
      getGenerator: () => {
        return () => {
          time += 1000 // Auto-increment by 1s for each operation
          return time
        }
      }
    }
  }

  describe('Scenario 1: Create 3 tasks sequentially, observe time allocation', () => {
    it('should correctly track individual task times when tasks are created in sequence', () => {
      const timeCtrl = createTimeController(1000)

      // Create Task A at t=2000 (auto-increments from 1000)
      state = TaskOperations.addAndStartTask('A', state, timeCtrl.getGenerator())
      const timeAfterA = timeCtrl.now()

      // Create Task B at t=3000
      state = TaskOperations.addAndStartTask('B', state, timeCtrl.getGenerator())
      const timeAfterB = timeCtrl.now()

      // Create Task C at t=4000
      state = TaskOperations.addAndStartTask('C', state, timeCtrl.getGenerator())
      const timeAfterC = timeCtrl.now()

      console.log('\n📋 Timeline:')
      console.log(`  A started at: ${timeAfterA - 1000}ms`)
      console.log(`  B started at: ${timeAfterB - 1000}ms`)
      console.log(`  C started at: ${timeAfterC - 1000}ms`)

      // Check state
      console.log('\n📊 Click History:')
      state.clickHistory.forEach((click, i) => {
        console.log(`  [${i}] Task ${click.taskId} clicked at ${click.timestamp}ms`)
      })

      // Now query tasks at t=4000 (just after C was created)
      const tasks = TaskQueries.getAllTasks(state, timeAfterC)

      console.log('\n🔍 Expected vs Actual at t=4000:')
      console.log('Task A:')
      console.log(`  Expected: currentSessionTime=0, lastSessionTime=0, totalTime=1000`)
      console.log(`  Actual:   currentSessionTime=${tasks[0].currentSessionTime}, lastSessionTime=${tasks[0].lastSessionTime}, totalTime=${tasks[0].totalTime}`)
      console.log(`  isRunning: ${tasks[0].isRunning}`)

      console.log('Task B:')
      console.log(`  Expected: currentSessionTime=0, lastSessionTime=0, totalTime=1000`)
      console.log(`  Actual:   currentSessionTime=${tasks[1].currentSessionTime}, lastSessionTime=${tasks[1].lastSessionTime}, totalTime=${tasks[1].totalTime}`)
      console.log(`  isRunning: ${tasks[1].isRunning}`)

      console.log('Task C:')
      console.log(`  Expected: currentSessionTime=0, lastSessionTime=0, totalTime=0`)
      console.log(`  Actual:   currentSessionTime=${tasks[2].currentSessionTime}, lastSessionTime=${tasks[2].lastSessionTime}, totalTime=${tasks[2].totalTime}`)
      console.log(`  isRunning: ${tasks[2].isRunning}`)

      // ASSERTIONS - These should pass IF logic is correct (times in SECONDS)
      expect(tasks[0].isRunning).toBe(false) // A is not running (C is running)
      expect(tasks[0].currentSessionTime).toBe(0) // Not running, so no current session
      expect(tasks[0].totalTime).toBe(1) // Should have accumulated 1s from its click to next click

      expect(tasks[1].isRunning).toBe(false) // B is not running
      expect(tasks[1].currentSessionTime).toBe(0)
      expect(tasks[1].totalTime).toBe(1) // Should have 1s from its click to C's click

      expect(tasks[2].isRunning).toBe(true) // C IS currently running
      expect(tasks[2].lastSessionTime).toBe(0) // C just started, no "last" session
    })
  })

  describe('Scenario 2: Create 3 tasks, then click B again - EXPOSES BUG', () => {
    it('should maintain correct time for all tasks when B is clicked again', () => {
      const timeCtrl = createTimeController(1000)

      // Timeline: A(2000) -> B(3000) -> C(4000) -> B(5000)
      state = TaskOperations.addAndStartTask('A', state, timeCtrl.getGenerator()) // A at 2000
      state = TaskOperations.addAndStartTask('B', state, timeCtrl.getGenerator()) // B at 3000
      state = TaskOperations.addAndStartTask('C', state, timeCtrl.getGenerator()) // C at 4000

      console.log('\n📋 Timeline (after creation):')
      state.clickHistory.forEach((click, i) => {
        console.log(`  [${i}] Task ${click.taskId} at ${click.timestamp}ms`)
      })

      // Now click B again at t=5000
      state = TaskOperations.startTask('3000', state, timeCtrl.getGenerator()) // Click B again at 5000

      console.log('\n📋 Timeline (after clicking B again):')
      state.clickHistory.forEach((click, i) => {
        console.log(`  [${i}] Task ${click.taskId} at ${click.timestamp}ms`)
      })

      const timeAtQuery = timeCtrl.now()
      const tasks = TaskQueries.getAllTasks(state, timeAtQuery)

      console.log('\n🔍 Expected vs Actual at t=5000:')
      console.log('Task A:')
      console.log(`  Expected: currentSessionTime=0, lastSessionTime=0, totalTime=1000, isRunning=false`)
      console.log(`  Actual:   currentSessionTime=${tasks[0].currentSessionTime}, lastSessionTime=${tasks[0].lastSessionTime}, totalTime=${tasks[0].totalTime}, isRunning=${tasks[0].isRunning}`)

      console.log('Task B:')
      console.log(`  Expected: currentSessionTime=0, lastSessionTime=0, totalTime=2000, isRunning=true`)
      console.log(`  Actual:   currentSessionTime=${tasks[1].currentSessionTime}, lastSessionTime=${tasks[1].lastSessionTime}, totalTime=${tasks[1].totalTime}, isRunning=${tasks[1].isRunning}`)
      console.log(`  Explanation: B had session [3000-4000]=1000ms, then [5000-now]=0ms, total=1000ms, still running`)

      console.log('Task C:')
      console.log(`  Expected: currentSessionTime=0, lastSessionTime=1000, totalTime=1000, isRunning=false`)
      console.log(`  Actual:   currentSessionTime=${tasks[2].currentSessionTime}, lastSessionTime=${tasks[2].lastSessionTime}, totalTime=${tasks[2].totalTime}, isRunning=${tasks[2].isRunning}`)
      console.log(`  Explanation: C had session [4000-5000]=1000ms, ended when B was clicked again`)

      // CRITICAL ASSERTIONS (note: times are in SECONDS, not milliseconds)
      expect(tasks[0].totalTime).toBe(1) // A: 2000->3000 = 1s
      expect(tasks[1].totalTime).toBe(1) // B: 3000->4000 = 1s (NOT counting the 5000 click yet)
      expect(tasks[1].isRunning).toBe(true) // B just got clicked, so it's running
      expect(tasks[2].totalTime).toBe(1) // C: 4000->5000 = 1s
      expect(tasks[2].lastSessionTime).toBe(1) // C's last (only) session was 1s
    })
  })

  describe('Scenario 3: Detailed breakdown of calculateTaskStats logic', () => {
    it('should show exactly which clicks are being counted for each task', () => {
      const timeCtrl = createTimeController(0)

      // Manually build a simple scenario
      state = {
        tasks: [
          { id: '1000', name: 'A' },
          { id: '2000', name: 'B' },
          { id: '3000', name: 'C' }
        ],
        clickHistory: [
          { taskId: '1000', timestamp: 1000 }, // A clicked at 1000
          { taskId: '2000', timestamp: 2000 }, // B clicked at 2000
          { taskId: '3000', timestamp: 3000 }, // C clicked at 3000
          { taskId: '2000', timestamp: 4000 }  // B clicked again at 4000
        ],
        lastModified: 4000
      }

      console.log('\n📋 Explicit Click History:')
      state.clickHistory.forEach((click, i) => {
        console.log(`  [${i}] Task ${click.taskId} at ${click.timestamp}ms`)
      })

      const queryTime = 5000
      const tasks = TaskQueries.getAllTasks(state, queryTime)

      console.log('\n🔍 Task Analysis at t=5000:')
      state.tasks.forEach((taskData, i) => {
        const task = tasks[i]
        console.log(`\n${taskData.name} (id=${taskData.id}):`)
        console.log(`  isRunning: ${task.isRunning}`)
        console.log(`  currentSessionTime: ${task.currentSessionTime}s`)
        console.log(`  lastSessionTime: ${task.lastSessionTime}s`)
        console.log(`  totalTime: ${task.totalTime}s`)
      })

      // Verify the logic
      expect(tasks[0].totalTime).toBe(1) // A: 1000->2000 = 1s
      expect(tasks[1].totalTime).toBe(2) // B: 2000->3000 = 1s, plus 4000->5000 = 1s, TOTAL = 2s
      expect(tasks[1].isRunning).toBe(true) // B is currently running (last click at 4000)
      expect(tasks[2].totalTime).toBe(1) // C: 3000->4000 = 1s
      expect(tasks[2].lastSessionTime).toBe(1) // C's session ended at 1s
    })
  })

  describe('Scenario 4: Expose the "0-out previous tasks" bug', () => {
    it('should NOT reset previous task times when adding new tasks', () => {
      const timeCtrl = createTimeController(0)

      // Create A
      state = TaskOperations.addAndStartTask('A', state, () => {
        return 1000
      })
      let snapshot1 = TaskQueries.getAllTasks(state, 1500)
      console.log(`\n✅ After creating A at 1000:`)
      console.log(`  A: totalTime=${snapshot1[0].totalTime}, currentSessionTime=${snapshot1[0].currentSessionTime}`)

      // Create B at t=2000
      state = TaskOperations.addAndStartTask('B', state, () => {
        return 2000
      })
      let snapshot2 = TaskQueries.getAllTasks(state, 2500)
      console.log(`\n✅ After creating B at 2000:`)
      console.log(`  A: totalTime=${snapshot2[0].totalTime}, currentSessionTime=${snapshot2[0].currentSessionTime}`)
      console.log(`  B: totalTime=${snapshot2[1].totalTime}, currentSessionTime=${snapshot2[1].currentSessionTime}`)

      // Create C at t=3000
      state = TaskOperations.addAndStartTask('C', state, () => {
        return 3000
      })
      let snapshot3 = TaskQueries.getAllTasks(state, 3500)
      console.log(`\n✅ After creating C at 3000:`)
      console.log(`  A: totalTime=${snapshot3[0].totalTime}, currentSessionTime=${snapshot3[0].currentSessionTime}`)
      console.log(`  B: totalTime=${snapshot3[1].totalTime}, currentSessionTime=${snapshot3[1].currentSessionTime}`)
      console.log(`  C: totalTime=${snapshot3[2].totalTime}, currentSessionTime=${snapshot3[2].currentSessionTime}`)

      // ASSERTIONS
      // When queried while A is running (at 1500), it has 0 completed sessions
      expect(snapshot1[0].totalTime).toBe(0)
      expect(snapshot1[0].currentSessionTime).toBe(0) // A just started, displaying 0

      // When queried after B was created (at 2500), A has completed 1 session
      expect(snapshot2[0].totalTime).toBe(1) // A ran from 1000->2000 = 1s
      expect(snapshot2[0].currentSessionTime).toBe(0) // A is not running anymore

      // When queried after C was created (at 3500), totals should remain the same
      expect(snapshot3[0].totalTime).toBe(1) // A's total should not change
      expect(snapshot3[1].totalTime).toBe(1) // B ran from 2000->3000 = 1s
    })
  })
})
