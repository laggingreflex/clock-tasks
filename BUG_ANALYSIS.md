# 🔴 CRITICAL BUG ANALYSIS - Time Calculation Logic

## Summary
The code has multiple severe logic flaws that cause incorrect time tracking. Tests expose 4 critical failures.

---

## 🐛 Bug #1: Task IDs Are Timestamps, Not Stable IDs

### The Problem
```typescript
const id = Date.now().toString()  // Task ID = timestamp when created
```

When you create Task A at t=2000, its ID becomes "2000".
When you create Task B at t=3000, its ID becomes "3000".

### Why This Breaks Everything
In `taskDataToTask()`, to check if a task is running:
```typescript
const isRunning = taskData.id === currentRunningTaskId
```

This compares the task's ID (timestamp) with the LAST CLICKED TASK'S ID.
- If last click was B (id="3000"), then only the task with id "3000" shows as running
- But task B's displayName comes from `taskData` which has name="B"
- The id "3000" must match exactly

**The real issue:** When you click a task, you're adding `{ taskId: id, timestamp }` to clickHistory, where `id` is the TASK's ID (which is the timestamp when that task was created).

So clicking Task B (id="3000") at t=5000 adds: `{ taskId: "3000", timestamp: 5000 }`

**This actually works correctly**, but it's a horrible design because:
1. Task IDs are not truly unique - if two tasks are created in the same millisecond, they collide
2. The ID is meaningless - it's just a timestamp
3. It's confusing to track

### Where It Fails: Scenario 4
Look at the test output:
```
✅ After creating A at 1000:
  A: totalTime=0, currentSessionTime=0

✅ After creating B at 2000:
  A: totalTime=1, currentSessionTime=0
  B: totalTime=0, currentSessionTime=0
```

**Wait - after creating B, why did A's totalTime jump from 0 to 1?**

Because A was created at 1000, and B was created at 2000.
The calculation is: (2000 - 1000) / 1000 = 1 second

This is correct! A ran from when it was created until when B was created.

But then the test expects `totalTime=1000` (milliseconds), when it's actually calculating `1` (seconds).

---

## 🐛 Bug #2: Time Unit Mismatch (Milliseconds vs Seconds)

### The Critical Issue
```typescript
const sessionDuration = Math.floor((endTime - clickTime) / 1000)
// This converts milliseconds to SECONDS
```

Your click timestamps are in milliseconds (Unix timestamps), but the calculation divides by 1000 to convert to **seconds**.

**Test expects:**
```typescript
expect(tasks[0].totalTime).toBe(1000)  // Expecting milliseconds
```

**Code calculates:**
```typescript
// 1000ms to 2000ms = 1000ms difference / 1000 = 1 second
totalTime = 1  // Returning SECONDS, not milliseconds!
```

### Timeline Example
```
A created at: 1000ms → click added: {taskId: "1000", timestamp: 1000}
B created at: 2000ms → click added: {taskId: "2000", timestamp: 2000}

Calculation for Task A's time:
  startTime = 1000
  endTime = 2000 (next click in global history)
  sessionDuration = (2000 - 1000) / 1000 = 1
  → Returns 1 second, NOT 1000 milliseconds
```

**This is the root cause of all test failures!**

---

## 🐛 Bug #3: lastSessionTime Logic is Broken

### The Code
```typescript
let previousSessionDuration = 0

for (let i = 0; i < taskClicks.length; i++) {
  // ... calculate sessionDuration ...

  if (i === taskClicks.length - 1) {
    currentSessionTime = sessionDuration
    lastSessionTime = previousSessionDuration  // ← BUG!
  } else {
    previousSessionDuration = sessionDuration
  }
}
```

### The Problem
When a task has multiple clicks (like B being clicked twice):
- `taskClicks` for B might be: `[{taskId: "3000", timestamp: 3000}, {taskId: "3000", timestamp: 5000}]`
- Loop iteration 0:
  - `sessionDuration` = (4000 - 3000) / 1000 = 1 second
  - Not the last click, so `previousSessionDuration = 1`
- Loop iteration 1:
  - `sessionDuration` = (5000 - 5000) / 1000 = 0 (query time not reached yet)
  - IS the last click, so:
    - `currentSessionTime = 0`
    - `lastSessionTime = previousSessionDuration = 1`

**But then in `taskDataToTask()`:**
```typescript
currentSessionTime: isRunning ? stats.currentSessionTime : 0,
lastSessionTime: !isRunning && stats.lastSessionTime > 0 ? stats.lastSessionTime : 0,
```

If the task IS running (`isRunning = true`), it only shows `currentSessionTime` and forces `lastSessionTime = 0`.

**This causes the bug from Scenario 2 and 3:**
- When B is clicked again, it becomes the running task
- So `isRunning = true`
- So `lastSessionTime` gets forced to 0, even though B had previous sessions!

---

## 🐛 Bug #4: Query Time Must Be Greater Than Last Click Time

### The Problem
In the test, when we query at exactly the click time:
```typescript
state = TaskOperations.addAndStartTask('A', state, () => 1000)
// clickHistory = [{taskId: "1000", timestamp: 1000}]

const tasks = TaskQueries.getAllTasks(state, 1000)  // Query at exact click time!
```

The calculation:
```typescript
const nextClickIndex = clickHistory.findIndex(e => e.timestamp > clickTime)
//                                                                    ↑
// Looks for GREATER THAN (not >=)

// If queryTime = 1000 (exact click time), nextClickIndex = -1
// So endTime = queryTime = 1000
// sessionDuration = (1000 - 1000) / 1000 = 0 seconds
```

**Solution:** Query times should always be **after** the last click, with enough delta to measure time.

---

## 📊 Test Output Analysis

### Scenario 3 (Detailed breakdown) - Closest to Truth
```
Click Timeline:
  [0] Task 1000 at 1000ms
  [1] Task 2000 at 2000ms
  [2] Task 3000 at 3000ms
  [3] Task 2000 at 4000ms

Query at t=5000 (1000ms after last click):
A (id=1000): totalTime=1s ✅ (1000→2000 = 1s)
B (id=2000): totalTime=2s ✅ (2000→3000 = 1s, 4000→5000 = 1s)
C (id=3000): totalTime=1s ✅ (3000→4000 = 1s)
```

**This test PASSES because:**
1. Query time (5000) is > last click time (4000)
2. Enough delta to measure time
3. Time units are seconds consistently (dividing ms by 1000)

---

## ✅ What the Tests Actually Show

### Failing Assertions are Wrong
The tests assert `totalTime` in milliseconds:
```typescript
expect(tasks[0].totalTime).toBe(1000)  // Wrong! Code returns SECONDS
```

Should be:
```typescript
expect(tasks[0].totalTime).toBe(1)  // Seconds, not milliseconds
```

---

## 🔧 REAL Bugs to Fix

### 1. Decide on Time Units
- **Option A:** Keep everything in milliseconds (don't divide by 1000)
- **Option B:** Keep everything in seconds (divide by 1000 everywhere)
- **Current:** Mixed! UI expects seconds, but tests assume milliseconds

### 2. The lastSessionTime / currentSessionTime Logic
When a task becomes the running task again:
- It should still show the time from its **last ended session** as `lastSessionTime`
- Currently it gets zeroed out

**Current logic:** `lastSessionTime: !isRunning && stats.lastSessionTime > 0 ? stats.lastSessionTime : 0`
- Only shows last session if NOT running
- But you might want to preserve it even while running

### 3. Time Query Delta
When calculating current session time for a running task:
```typescript
const sessionDuration = Math.floor((endTime - clickTime) / 1000)
// endTime is the QUERY time passed in
// This gives: (queryTime - clickTime) / 1000
```

This is correct! The query time acts as "now". So if:
- Task clicked at 4000ms
- Query time = 5000ms
- sessionDuration = (5000 - 4000) / 1000 = 1 second (current session)

---

## 📝 Corrected Test Expectations

For Scenario 3 (which passes):
```typescript
const queryTime = 5000

// A: clicked at 1000, ended at 2000 (next click)
expect(tasks[0].totalTime).toBe(1)  // seconds!
expect(tasks[0].currentSessionTime).toBe(0)  // not running
expect(tasks[0].lastSessionTime).toBe(0)  // no special last session

// B: clicked at 3000 (ended at 4000), clicked again at 4000 (running until 5000)
expect(tasks[1].totalTime).toBe(2)  // 1s + 1s
expect(tasks[1].currentSessionTime).toBe(1)  // running, so: 5000-4000=1s
expect(tasks[1].isRunning).toBe(true)

// C: clicked at 3000, ended at 4000 (when B clicked again)
expect(tasks[2].totalTime).toBe(1)  // 4000-3000=1s
expect(tasks[2].currentSessionTime).toBe(0)  // not running
expect(tasks[2].lastSessionTime).toBe(0)  // was only session, now count in totalTime
```

---

## 🎯 Bottom Line

The core algorithm is **mostly correct** for the basic case (Scenario 3).

The main issues are:
1. ⚠️ **Time unit confusion** - API uses seconds but naming suggests milliseconds
2. ⚠️ **lastSessionTime semantics** - unclear when it should be populated vs zeroed
3. ⚠️ **Dependency injection** - now added, allows controlled testing
4. 🆗 **Logic is sound** - multiply sessions per task work correctly (see Scenario 3)

The "0-out previous tasks" bug from your AGENTS.md may be a **display/persistence issue**, not a calculation issue.
