/**
 * Test your exact scenario to see if the core logic matches your expectations
 */

import { TaskOperations, TaskQueries, type TaskManagerState } from './taskManager'

let now = 1000
const getTimestamp = () => now

let state: TaskManagerState = {
  tasks: [],
  clickHistory: [],
  lastModified: 0
}

// Step 1: Add task A (should start running)
console.log('\n=== STEP 1: Add task A ===')
state = TaskOperations.addAndStartTask('A', state, getTimestamp)
console.log('Tasks:', state.tasks.map(t => t.name))
console.log('Click history:', state.clickHistory)
const tasksAfterA = TaskQueries.getAllTasks(state, now)
console.log('Task A stats:', tasksAfterA[0])
console.log('Expected: A is running with currentSessionTime growing')

// Step 2: Add task B (should start running, A should stop)
console.log('\n=== STEP 2: Add task B ===')
now = 5000
state = TaskOperations.addAndStartTask('B', state, getTimestamp)
console.log('Tasks:', state.tasks.map(t => t.name))
console.log('Click history:', state.clickHistory)
const tasksAfterB = TaskQueries.getAllTasks(state, now)
console.log('Task A:', tasksAfterB[0])
console.log('Task B:', tasksAfterB[1])
console.log('Expected: A.lastSessionTime=4s (5000-1000), B is running, B.currentSessionTime=0')

// Step 3: Add task C (should start running, B should stop)
console.log('\n=== STEP 3: Add task C ===')
now = 10000
state = TaskOperations.addAndStartTask('C', state, getTimestamp)
console.log('Tasks:', state.tasks.map(t => t.name))
console.log('Click history:', state.clickHistory)
const tasksAfterC = TaskQueries.getAllTasks(state, now)
console.log('Task A:', tasksAfterC[0])
console.log('Task B:', tasksAfterC[1])
console.log('Task C:', tasksAfterC[2])
console.log('Expected: A.totalTime=4s, B.lastSessionTime=5s (10000-5000), C is running')

// Step 4: Click A again (should start running A, stop C)
console.log('\n=== STEP 4: Click A again ===')
now = 15000
state = TaskOperations.startTask(state.tasks[0].id, state, getTimestamp)
console.log('Tasks:', state.tasks.map(t => t.name))
console.log('Click history:', state.clickHistory)
const tasksAfterClickA = TaskQueries.getAllTasks(state, now)
console.log('Task A:', tasksAfterClickA[0])
console.log('Task B:', tasksAfterClickA[1])
console.log('Task C:', tasksAfterClickA[2])
console.log('Expected per your logic:')
console.log('  - A should have ONLY ONE start time in storage (the latest at 15000)')
console.log('  - A.lastSessionTime should be 5s (time from when C started)')
console.log('  - A.totalTime should still be 4s + current gap = 4s + 5s = 9s')
console.log('\nACTUAL per current code:')
console.log('  - A will have TWO start times (1000 and 15000) in clickHistory')
console.log('  - This affects how totalTime and lastSessionTime are calculated')
