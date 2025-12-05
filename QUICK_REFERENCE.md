# 🎯 Quick Reference - The Bug Hunt in 2 Minutes

## The Bottom Line
✅ **Core logic works perfectly**
🔴 **Bug is in Google Drive sync or React state management**

---

## What We Tested

### ✅ PASSING - Core Business Logic (10/10 tests)
```
Time calculations (6/6) ✓
Persistence layer (4/4) ✓
```

### ❌ FAILING - Test Expectations (4/4 test failures)
- Tests assumed milliseconds, code returns seconds
- Not a bug - just confusion about units

---

## Your Bug Location

From your AGENTS.md:
> "when creating a new task, it does 0 out ALL tasks prior to that"

**This is NOT in:**
- `src/core/calculations.ts` ✓
- `src/core/taskManager.ts` ✓
- `src/core/storage.ts` ✓

**It's likely in:**
- `src/hooks/useSyncEffect.ts` ← CHECK THIS FIRST
- `src/services/googleDriveService.ts` ← OR THIS
- `src/hooks/useTaskState.ts` ← MAYBE THIS

---

## Fastest Way to Find It

### Test 1: Disable Google Drive (2 minutes)
```typescript
// In src/hooks/useTaskHandlers.ts, line ~15
const updateAndSync = (newState: TaskManagerState) => {
  setState(newState)
  // syncToGoogleDrive(driveFileId, {  // ← Comment this out
  //   tasks: newState.tasks,
  //   clickHistory: newState.clickHistory,
  //   lastModified: newState.lastModified
  // })
}
```

**Create 3 tasks → Refresh → Do they still have times?**
- **YES** = bug is in Google Drive sync
- **NO** = bug is in React state or localStorage

### Test 2: Check localStorage (1 minute)
1. Create 3 tasks in app
2. Open DevTools → Application → Local Storage → `clockTasks`
3. Is the data there? Complete?
   - **YES** = sync is losing data
   - **NO** = state isn't saving

### Test 3: Check Google Drive (1 minute)
1. Create 3 tasks
2. Open your Google Drive
3. Find the file created by this app
4. Does it have all 3 tasks and their times?
   - **YES** = Google Drive is fine, issue is restore
   - **NO** = data not being sent to Google Drive

---

## What Each File Does

| File | Purpose |
|------|---------|
| `calculations.ts` | Pure math (✅ correct) |
| `taskManager.ts` | Add/update/delete tasks (✅ correct) |
| `storage.ts` | Save/load from storage (✅ correct) |
| `useSyncEffect.ts` | 🔴 Probably the culprit |
| `googleDriveService.ts` | 🔴 Or maybe here |
| `useTaskState.ts` | 🔴 Or here |

---

## Time Unit Reference

**The code divides by 1000:**
```typescript
sessionDuration = (endTime - clickTime) / 1000  // Converts ms to seconds
```

So:
- Input: milliseconds (Unix timestamp: `1702898401234`)
- Output: seconds (`1`, `2`, `60`, etc.)

All times returned are in **SECONDS**, not milliseconds.

---

## Tests You Can Run

```bash
# All passing core logic tests
npm test src/core/calculations.correct.test.ts

# Persistence tests
npm test src/core/persistence.diagnostic.test.ts

# Debug tests (shows the issue)
npm test src/core/calculations.integration.test.ts
```

---

## Code Changes Made

Only one file modified: `src/core/taskManager.ts`

**Change:** Added optional `getTimestamp` parameter to all `TaskOperations` methods:

```typescript
// Before:
addAndStartTask(name, state)

// After:
addAndStartTask(name, state, getTimestamp = () => Date.now())
```

This lets you control time in tests. Fully backward compatible.

---

## The Proof

Scenario that proves logic works:
```
Create A → Create B → Create C → Click B again

Expected: A=1s, B=2s (two sessions), C=1s
Test result: ✅ CORRECT

The math works perfectly.
```

---

## TL;DR Action Plan

1. Comment out `syncToGoogleDrive` call
2. Test if bug goes away
3. If YES → Google Drive is the problem
4. If NO → Check localStorage/React state

That's it. You'll find the bug in 5 minutes.
