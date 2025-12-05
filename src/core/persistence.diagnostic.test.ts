/**
 * Diagnostic tests for the "tasks getting zeroed out" persistence bug
 * 
 * This test suite simulates the exact flow:
 * 1. Create 3 tasks in UI
 * 2. Save to localStorage (as happens in your sync)
 * 3. Refresh/reload (new session)
 * 4. Load from localStorage
 * 5. Query tasks and see if they're zeroed
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { TaskOperations, TaskQueries } from './taskManager'
import { InMemoryBackend } from './storage'
import type { TaskManagerState } from './taskManager'
import type { StoredData } from './types'

describe('Persistence Bug Hunt - Task Zeroing Issue', () => {
  let backend: InMemoryBackend
  let state: TaskManagerState

  beforeEach(() => {
    backend = new InMemoryBackend()
    state = {
      tasks: [],
      clickHistory: [],
      lastModified: 0
    }
  })

  describe('Scenario A: Manual time-controlled creation and persistence', () => {
    it('should preserve all task times after save/load cycle', async () => {
      console.log('\n🔄 PERSISTENCE TEST - Manual Time Control\n')

      // === PHASE 1: Create tasks with controlled timestamps ===
      console.log('PHASE 1: Creating tasks...')

      const createA = () => 1000
      const createB = () => 2000
      const createC = () => 3000

      state = TaskOperations.addAndStartTask('A', state, createA)
      console.log(`✓ Created A at 1000ms, clickHistory length: ${state.clickHistory.length}`)

      state = TaskOperations.addAndStartTask('B', state, createB)
      console.log(`✓ Created B at 2000ms, clickHistory length: ${state.clickHistory.length}`)

      state = TaskOperations.addAndStartTask('C', state, createC)
      console.log(`✓ Created C at 3000ms, clickHistory length: ${state.clickHistory.length}`)

      // === PHASE 2: Query before persistence ===
      console.log('\nPHASE 2: Query before persistence (at t=3500)...')
      const beforeSave = TaskQueries.getAllTasks(state, 3500)
      console.log('Before save:')
      beforeSave.forEach((task, i) => {
        console.log(`  Task ${task.name}: totalTime=${task.totalTime}s, isRunning=${task.isRunning}`)
      })

      // === PHASE 3: Save to "localStorage" (using InMemoryBackend) ===
      console.log('\nPHASE 3: Saving to storage...')
      const storedData: StoredData = {
        tasks: state.tasks,
        clickHistory: state.clickHistory,
        lastModified: state.lastModified
      }
      console.log(`  Storing ${storedData.tasks.length} tasks and ${storedData.clickHistory.length} click events`)
      await backend.save(storedData)
      console.log('✓ Saved successfully')

      // === PHASE 4: Simulate refresh - load from storage ===
      console.log('\nPHASE 4: Simulating refresh - loading from storage...')
      const loaded = await backend.load()
      console.log(`  Loaded ${loaded.tasks.length} tasks and ${loaded.clickHistory.length} click events`)

      // Rebuild state from loaded data
      const restoredState: TaskManagerState = {
        tasks: loaded.tasks,
        clickHistory: loaded.clickHistory,
        lastModified: loaded.lastModified
      }

      // === PHASE 5: Query after restoration ===
      console.log('\nPHASE 5: Query after restoration (at t=3500)...')
      const afterLoad = TaskQueries.getAllTasks(restoredState, 3500)
      console.log('After load:')
      afterLoad.forEach((task, i) => {
        console.log(`  Task ${task.name}: totalTime=${task.totalTime}s, isRunning=${task.isRunning}`)
      })

      // === PHASE 6: Compare ===
      console.log('\nPHASE 6: Comparison (BUG CHECK)...')
      let hasZerodBug = false
      beforeSave.forEach((taskBefore, i) => {
        const taskAfter = afterLoad[i]
        if (taskBefore.totalTime !== taskAfter.totalTime) {
          console.log(`  ❌ Task ${taskBefore.name}: CHANGED from ${taskBefore.totalTime}s to ${taskAfter.totalTime}s`)
          hasZerodBug = true
        } else {
          console.log(`  ✓ Task ${taskBefore.name}: OK (${taskBefore.totalTime}s)`)
        }
      })

      // === ASSERTIONS ===
      expect(loaded.tasks.length).toBe(3)
      expect(loaded.clickHistory.length).toBe(3)

      // Times should be identical before and after
      expect(afterLoad[0].totalTime).toBe(beforeSave[0].totalTime)
      expect(afterLoad[1].totalTime).toBe(beforeSave[1].totalTime)
      expect(afterLoad[2].totalTime).toBe(beforeSave[2].totalTime)

      expect(hasZerodBug).toBe(false)
    })
  })

  describe('Scenario B: Rapid creation (potential timestamp collision)', () => {
    it('should handle tasks created very close together', async () => {
      console.log('\n🔄 RAPID CREATION TEST\n')

      let timestamp = 1000

      // Create 3 tasks with minimal delay (could this cause issues?)
      state = TaskOperations.addAndStartTask('A', state, () => timestamp)
      timestamp += 100
      state = TaskOperations.addAndStartTask('B', state, () => timestamp)
      timestamp += 100
      state = TaskOperations.addAndStartTask('C', state, () => timestamp)

      console.log('Created A, B, C in quick succession (100ms apart)')
      console.log(`Tasks: ${state.tasks.length}`)
      console.log(`Clicks: ${state.clickHistory.length}`)

      const before = TaskQueries.getAllTasks(state, timestamp + 100)
      console.log('Before persistence:', before.map(t => `${t.name}=${t.totalTime}s`).join(', '))

      await backend.save({
        tasks: state.tasks,
        clickHistory: state.clickHistory,
        lastModified: state.lastModified
      })

      const loaded = await backend.load()
      const restoredState: TaskManagerState = {
        tasks: loaded.tasks,
        clickHistory: loaded.clickHistory,
        lastModified: loaded.lastModified
      }

      const after = TaskQueries.getAllTasks(restoredState, timestamp + 100)
      console.log('After restore:', after.map(t => `${t.name}=${t.totalTime}s`).join(', '))

      // All should match
      before.forEach((t, i) => {
        expect(after[i].totalTime).toBe(t.totalTime)
      })
    })
  })

  describe('Scenario C: Identify if sync clears old tasks', () => {
    it('should verify if sync operations preserve clickHistory', async () => {
      console.log('\n🔄 SYNC OPERATION TEST\n')

      // Create state with tasks
      state = TaskOperations.addAndStartTask('A', state, () => 1000)
      state = TaskOperations.addAndStartTask('B', state, () => 2000)

      const clickHistoryBefore = state.clickHistory.length
      console.log(`Before sync: ${state.clickHistory.length} clicks`)

      // Simulate a sync operation that might clear data
      const syncedData: StoredData = {
        tasks: state.tasks,
        clickHistory: state.clickHistory,  // Make sure this is included!
        lastModified: state.lastModified
      }

      // ⚠️ BUG CHECK: Is clickHistory being included in sync?
      if (syncedData.clickHistory.length === 0) {
        console.log('❌ BUG FOUND: clickHistory is empty in sync payload!')
      } else {
        console.log(`✓ clickHistory included: ${syncedData.clickHistory.length} items`)
      }

      await backend.save(syncedData)
      const loaded = await backend.load()

      console.log(`After sync: ${loaded.clickHistory.length} clicks`)

      expect(loaded.clickHistory.length).toBe(clickHistoryBefore)
      expect(loaded.clickHistory.length).toBeGreaterThan(0)
    })
  })

  describe('Scenario D: Trace the exact moment of zeroing', () => {
    it('should log state at each step to find where zeroing happens', async () => {
      console.log('\n📊 DETAILED STATE TRACE\n')

      // Step by step
      console.log('Step 1: Create A')
      state = TaskOperations.addAndStartTask('A', state, () => 1000)
      logState('After A', state)

      console.log('\nStep 2: Create B')
      state = TaskOperations.addAndStartTask('B', state, () => 2000)
      logState('After B', state)

      console.log('\nStep 3: Create C')
      state = TaskOperations.addAndStartTask('C', state, () => 3000)
      logState('After C', state)

      console.log('\nStep 4: Save')
      await backend.save({
        tasks: state.tasks,
        clickHistory: state.clickHistory,
        lastModified: state.lastModified
      })
      logState('Saved state', state)

      console.log('\nStep 5: Load')
      const loaded = await backend.load()
      logState('Loaded state', {
        tasks: loaded.tasks,
        clickHistory: loaded.clickHistory,
        lastModified: loaded.lastModified
      })

      console.log('\nStep 6: Query')
      const query = TaskQueries.getAllTasks(loaded, 3500)
      console.log('Query result:', query.map(t => `${t.name}=${t.totalTime}s`).join(', '))
    })
  })
})

/**
 * Helper to print state in readable format
 */
function logState(label: string, state: TaskManagerState) {
  console.log(`\n  [${label}]`)
  console.log(`    Tasks: ${state.tasks.length}`, state.tasks.map(t => `(${t.id}:${t.name})`))
  console.log(`    Clicks: ${state.clickHistory.length}`, state.clickHistory.map(c => `(${c.taskId}@${c.timestamp})`))
}
