# 🔴 CRITICAL BUG ANALYSIS - Time Calculation Logic

## Summary
Tests expose time unit mismatches and design issues.

---

## 🐛 Main Issues

### Issue 1: Task IDs Are Timestamps, Not Stable IDs

```typescript
const id = Date.now().toString()  // Task ID = timestamp when created
```

**Problems:**
- Two tasks created in same millisecond = collision
- ID has no semantic meaning
- Confusing to debug

---

### Issue 2: Time Unit Mismatch (Milliseconds vs Seconds)

**Code divides by 1000:**
```typescript
const sessionDuration = Math.floor((endTime - clickTime) / 1000)
```

**Result:** All times returned in **SECONDS**, not milliseconds.

**Test expects:** `totalTime = 1000` (milliseconds)  
**Code returns:** `totalTime = 1` (seconds)

**This is the root cause of test failures!**

---

### Issue 3: lastSessionTime Logic

When task becomes running again, `lastSessionTime` is forced to 0 even though it had previous sessions.

```typescript
lastSessionTime: !isRunning && stats.lastSessionTime > 0 ? stats.lastSessionTime : 0
```

---

## ✅ What Works

1. **Multiple Sessions Per Task** - Works perfectly
2. **No Task Time Reset** - Times persist correctly
3. **Current Session Time** - Calculated correctly
4. **Task Identification** - Works (though IDs are hacky)

---

## 🎯 Bottom Line

The core algorithm is **mostly correct**.

The main issues are:
1. ⚠️ **Time unit confusion** - API uses seconds but naming suggests milliseconds
2. ⚠️ **lastSessionTime semantics** - unclear when it should be populated vs zeroed
3. ⚠️ **Task ID design** - should use UUID or counter instead of timestamps
4. 🆗 **Logic is sound** - multiple sessions per task work correctly
