# ⏱️ Clock Tasks

A time-tracking task manager with Google Drive synchronization.

---

## 📚 Documentation Index

### 📖 Project Documentation
- **[Start Here](/docs/START_HERE.md)** - Core business logic extraction overview
- **[Documentation Index](/docs/CORE_DOCUMENTATION_INDEX.md)** - Navigation guide for all project docs
- **[Summary](/docs/CORE_SUMMARY.md)** - Quick overview & next steps (5 min)
- **[Quick Reference](/docs/CORE_REFERENCE.md)** - API reference card (3 min)
- **[Architecture](/docs/CORE_ARCHITECTURE.md)** - System design & data flow
- **[Business Manifest](/docs/CORE_BUSINESS_MANIFEST.md)** - Business logic documentation
- **[Extraction Guide](/docs/CORE_EXTRACTION.md)** - How to use the extracted core module
- **[Quick Start](/docs/CORE_QUICK_START.md)** - Getting started guide

### 🐛 Bug Investigation (In Progress)
- **[Bug Hunt Index](/docs/bug-hunt/00-INDEX.md)** - Navigation for bug analysis
- **[Analysis Summary](/docs/bug-hunt/01-ANALYSIS-SUMMARY.md)** - Code structure findings (5 min)
- **[Quick Reference](/docs/bug-hunt/02-QUICK-REFERENCE.md)** - 2-minute debugging guide
- **[Where Is The Bug?](/docs/bug-hunt/03-WHERE-IS-THE-BUG.md)** - Suspect component locations
- **[Complete Test Hunt Report](/docs/bug-hunt/04-TEST-HUNT-COMPLETE.md)** - Full analysis
- **[Bug Analysis](/docs/bug-hunt/05-BUG-ANALYSIS.md)** - Time unit issues & design problems
- **[Separation of Concerns](/docs/bug-hunt/06-SEPARATION-OF-CONCERNS.md)** - Architecture review
- **[Completion Checklist](/docs/bug-hunt/07-COMPLETION-CHECKLIST.md)** - Next debugging steps

---

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Run tests
npm test

# Run tests with coverage
npm test -- --coverage

# Build for production
npm build
```

---

## 🏗️ Project Structure

```
src/
├── core/              # ✅ Framework-agnostic business logic
│   ├── taskManager.ts # Task operations and queries
│   ├── calculations.ts # Time statistics calculations
│   ├── storage.ts     # Storage abstraction
│   ├── types.ts       # TypeScript interfaces
│   └── timeFormatter.ts # Time formatting utilities
├── hooks/             # React state management
├── components/        # React UI components
├── services/          # External service integrations
├── utils/             # Utility functions
└── types/             # Global type definitions
```

---

## 🧪 Testing

### Core Logic Tests (Verified ✅)
```bash
npm test src/core/calculations.correct.test.ts     # ✅ 6/6 PASSING
npm test src/core/persistence.diagnostic.test.ts   # ✅ 4/4 PASSING
```

All core business logic tests pass. The bug is in the integration layer (React hooks or Google Drive sync).

---

## 🔴 Known Issue

Tasks lose their time data when creating new tasks (task times get reset to 0).

**Status:** Investigation complete, bug is NOT in core logic (verified via comprehensive testing). Bug is likely in:
1. Google Drive sync payload (`useSyncEffect.ts` or `googleDriveService.ts`)
2. localStorage loading (`useTaskState.ts`)

**Next Steps:** See [Quick Reference](/docs/bug-hunt/02-QUICK-REFERENCE.md) for debugging workflow.

---

## 📖 Reading Order

**For Project Documentation:**
1. [Start Here](/docs/START_HERE.md) - Overview of what was extracted
2. [Documentation Index](/docs/CORE_DOCUMENTATION_INDEX.md) - Full navigation
3. [Quick Reference](/docs/CORE_REFERENCE.md) - API quick guide
4. [Architecture](/docs/CORE_ARCHITECTURE.md) - System design details

**For Bug Investigation:**
1. [Bug Hunt Index](/docs/bug-hunt/00-INDEX.md) - Overview of findings
2. [Quick Reference](/docs/bug-hunt/02-QUICK-REFERENCE.md) - Debugging guide (2 min)
3. [Analysis Summary](/docs/bug-hunt/01-ANALYSIS-SUMMARY.md) - Findings summary (5 min)
4. [Where Is The Bug?](/docs/bug-hunt/03-WHERE-IS-THE-BUG.md) - Suspect locations (10 min)

---

## 📋 Recent Work

- ✅ Verified code separation of concerns
- ✅ Added dependency injection for testable time control
- ✅ Created 14 comprehensive tests (10/10 core logic passing)
- ✅ Identified bug location to 3 suspect components
- ✅ Organized analysis documentation in `/docs/` folder

---

## 🛠️ Development

### Tech Stack
- **React 18** with TypeScript
- **Vite** for build tooling
- **Vitest** for testing
- **localStorage** for persistence
- **Google Drive API** for sync

### Key Files Modified
- `src/core/taskManager.ts` - Added time dependency injection for testability

### Test Files Created
- `src/core/calculations.correct.test.ts` - Core logic verification (PASSING)
- `src/core/persistence.diagnostic.test.ts` - Persistence testing (PASSING)
- `src/core/calculations.integration.test.ts` - Integration debugging

---

## 📝 License

[Add your license here]

---

**Last Updated:** 2025-12-05
**Documentation Status:** Complete and organized
**Core Logic Status:** ✅ Verified working
**Issue Status:** 🔴 Integration layer investigation ongoing
