# Clock Tasks

Clock Tasks is a local-first, click-driven time tracker built with React 19, TypeScript, and Vite. Every task switch is stored as an immutable history event so totals are always reproducible, whether you stay in guest mode or sign in and sync through Firebase or Google Drive.

![Animated demo of Clock Tasks](public/screenshot.gif)

## Highlights
- **Local-first guest mode** - `useTaskState` hydrates the UI from `localStorage` (key `clockTasks`) immediately; signing in later simply overrides that state and keeps the cache fresh for offline access.
- **Single-click task switching** - focusing any task row calls `TaskOperations.startTask`, so every click appends a `ClickEvent` instead of running timers and ensures a perfect audit trail.
- **Live stats everywhere** - `useCurrentTime` ticks every second, `TaskQueries.getAllTasks` recomputes totals, and both the header and document title show the formatted total via `formatTime`.
- **Cloud sync choices** - Firebase Realtime Database (default) pushes updates instantly, Google Drive polling (~10 s interval) is available via `VITE_AUTH_PROVIDER=google`, and both paths fall back to local persistence if anything fails.
- **Inline management controls** - add tasks with Enter, rename inline, toggle deletion mode to reveal delete buttons, stop/reset all timers, switch sort (total vs alphabetical), and flip read-only mode (adds or removes `?readonly` in the URL).
- **Framework-agnostic core** - everything in `src/core` is pure TypeScript (calculations, storage helpers, task manager, time formatting, tests) so the same business logic can back CLIs, native apps, or automation scripts.

## Usage & UI Behavior
1. **Sign in only if you need cloud sync.** The app loads as a guest using `authProvider.loadUser()`. Click the avatar to trigger the hidden `<LoginComponent>` button; after signing in, a logout button appears inside the avatar menu.
2. **Add tasks inline.** `AddTaskForm` calls `TaskOperations.addAndStartTask`, so pressing Enter both creates and focuses the new task. IDs are timestamp-based so chronological order matches creation time.
3. **Start or switch tasks by focusing fields.** Each task row is just an `<input>`. Focusing it calls `useTaskHandlers.handleStartTask`, appends a history event, and ignores clicks on the already running task.
4. **Rename tasks without modals.** Editing the text box triggers `TaskOperations.updateTaskName` immediately. No blur/save buttons are needed.
5. **Delete safely.** Tap the 🗑 button in the Controls bar once to enter deletion mode (delete buttons render inside every row). Each delete and delete-all action uses `window.confirm` before mutating state.
6. **Stop or reset all timers.** ⏹ appends a sentinel `ClickEvent` (`taskId="__STOP__"`) so nothing is "running"; 🔄 clears `history` but keeps the task list intact.
7. **Sort & persist preferences.** The ⏱/🔤 toggle switches between total time and alphabetical order. The preference is stored as `sortMode` alongside the task data inside the `clockTasks` blob.
8. **Read-only mode.** Clicking the lock icon rewrites the current location with or without the `readonly` query param and reloads the page. While `OptionsContext` reports `{ readOnly: true }`, `useTaskHandlers` and `useSyncEffect` short-circuit, so no local or cloud writes occur.
9. **Sync model.** `useSyncEffect` memoizes the current `StorageProvider`, loads cloud data once you are signed in, mirrors every change back to local storage, and starts the provider’s listener (`onValue` for Firebase or polling for Google Drive). In guest mode it clears the provider user ID and relies solely on local storage.

## Quick Start
Requirements: Node 18+ (Vite 5), npm 10+, and the Firebase CLI if you plan to deploy.

```bash
npm install                  # install dependencies
npm start                    # Vite dev server on port 7428 (see vite.config.ts)
npm run build                # type-check (tsc -b) + Vite production build to dist/
npm run dev                  # vite preview (serves the last build)
npm test                     # builds first, then runs Vitest in run mode
npm run test:ui              # builds first, then launches the Vitest UI
npm run test:coverage        # builds first, then outputs V8 coverage
npm run lint                 # eslint flat config with react-hooks/react-refresh rules
npm run deploy               # build then firebase deploy (requires firebase-tools)
```

The test scripts intentionally run `npm run build` before Vitest so they always execute against the latest compiled artifacts.

## Configuration
### Environment
Create a `.env` (or `.env.local`) next to `package.json` and provide the Firebase and Google settings referenced in `src/services/firebaseConfig.ts` and `src/services/providers/googleAuthProvider.ts`:

```ini
VITE_FIREBASE_API_KEY=...
VITE_FIREBASE_AUTH_DOMAIN=...
VITE_FIREBASE_DATABASE_URL=...
VITE_FIREBASE_PROJECT_ID=...
VITE_FIREBASE_STORAGE_BUCKET=...
VITE_FIREBASE_MESSAGING_SENDER_ID=...
VITE_FIREBASE_APP_ID=...
VITE_FIREBASE_MEASUREMENT_ID=...
VITE_GOOGLE_CLIENT_ID=your-oauth-client.apps.googleusercontent.com
VITE_AUTH_PROVIDER=firebase   # or google
VITE_BASE_PATH=/              # optional, overrides Vite base for static hosting
```

`firebaseConfig.ts` throws on startup if any required Firebase variable is missing.

### Provider selection
`getCurrentProviderName()` checks `import.meta.env.VITE_AUTH_PROVIDER` first, then `localStorage.getItem('authProvider')`, defaulting to Firebase. Call `setCurrentProvider('google')` (from the browser console) to persist the override for the current device. `logProviderConfiguration()` writes the final choice to the console on every app boot.

### Read-only mode
Append `?readonly` (value optional) to the URL or use the lock button in the Controls bar. The button rewrites `window.location.href`, so toggling read-only refreshes the app to guarantee the option propagates through `OptionsContext`.

## Architecture Overview
Clock Tasks enforces a three-layer separation:
1. **Core (`src/core`)** - pure TypeScript business logic (`calculations.ts`, `taskManager.ts`, `storage.ts`, `storageCore.ts`, `timeFormatter.ts`, `types.ts`, `index.ts`, plus vitest suites such as `calculations.test.ts`, `taskManager.test.ts`, `storage.test.ts`, `persistence.diagnostic.test.ts`). `reconciliation.ts` still lives here as a reference implementation but is not imported anywhere.
2. **Providers (`src/services/providers`)** - browser/cloud adapters implementing shared interfaces in `types.ts`, plus `providerConfig.ts` for selecting Firebase or Google backends and memoizing singleton instances. `LocalStorageBackend` also lives here because browser APIs are not allowed inside `src/core`.
3. **React UI (`src/components`, `src/hooks`, `src/styles`, `App.tsx`, `main.tsx`)** - hooks orchestrate state (`useTaskState`, `useTaskHandlers`, `useSyncEffect`, `useUIState`, `useSortedTasks`, `OptionsContext`, and helper hooks like `useClickOutside`, `useDocumentTitle`, `useScrollToNewTask`, `useCurrentTime`). Components (`AddTaskForm`, `TaskList`, `TaskItem`, `Controls`, `UserHeader`, `LoginComponent`) stay thin and declarative. `ConflictDialog.tsx` (and its CSS) is present but currently unused.

Supporting folders:
- `src/services/firebaseConfig.ts` bootstraps Firebase Auth + Realtime Database; `src/services/firebaseService.ts` and `src/utils/firebaseAuthHelpers.ts` remain for historical reference but are not imported.
- `src/utils/logger.ts` hosts the `createLogger` helper referenced throughout the core/services layers.
- `src/types/index.ts` re-exports the core types and declares the `User` shape used in the UI layer.
- `src/archive/` keeps the deprecated Google Drive service and documentation so older migrations remain traceable.
- `public/` contains icons and the README GIF; `dist/` holds production builds.

```
clock-tasks/
  src/
    App.tsx, main.tsx
    core/
      calculations.ts
      taskManager.ts
      storage.ts, storageCore.ts
      timeFormatter.ts, types.ts, index.ts
      reconciliation.ts (unused helper)
      *.test.ts (Vitest suites)
    components/
      AddTaskForm.tsx, Controls.tsx, TaskItem.tsx, TaskList.tsx,
      LoginComponent.tsx, UserHeader.tsx, ConflictDialog.tsx
    hooks/
      OptionsContext.ts
      useTaskState.ts, useTaskHandlers.ts, useSyncEffect.ts,
      useUIState.ts, useSortedTasks.ts
      index.ts exports useClickOutside/useDocumentTitle/useScrollToNewTask/useCurrentTime
    services/
      firebaseConfig.ts, firebaseService.ts (legacy)
      providers/
        types.ts, providerConfig.ts
        firebaseAuthProvider.ts, firebaseStorageProvider.ts
        googleAuthProvider.ts, googleDriveStorageProvider.ts
        localStorageProvider.ts
    utils/
      logger.ts, storageHelpers.ts, firebaseAuthHelpers.ts (legacy)
    styles/
      App.css, styles/ConflictDialog.css, etc.
    archive/
      googleDriveService.ts, README.md
```

## Layering & Provider Guidelines
- `AuthProvider` and `StorageProvider` interfaces (in `src/services/providers/types.ts`) define the contract for Firebase, Google, or any future backend. Storage providers extend the core `StorageBackend` with `setUserId`, `startListening`, `stopListening`, `clearUser`, and `isListening` for real-time coordination.
- `providerConfig.ts` caches provider instances, shares Google OAuth tokens via `GoogleTokenStore`, and exposes `getAuthProvider()`, `getStorageProvider()`, and `setCurrentProvider()` helpers.
- `useSyncEffect` memoizes whichever provider is selected and exposes a function named `syncToGoogleDrive`. The name is historical—the function simply persists via the active provider whenever `driveFileId === 'cloud'` (the sentinel meaning "cloud sync is live").
- `LocalStorageBackend` implements the core `StorageBackend` interface and powers guest mode and local caching even while cloud sync is active.
- Real-time Firebase updates use `onValue` and deduplicate payloads by tracking `lastModified`. Google Drive polling compares file contents every ~10 seconds. Both approaches call the same callback shape (`(data: StoredData) => void`).
- `useTaskHandlers` wraps every user action in `updateAndSync`, ensuring local state updates and persistence stay in lockstep. When `readOnly` is true, the handlers exit early and no persistence occurs.
- Legacy helpers (`src/services/firebaseService.ts`, `src/utils/firebaseAuthHelpers.ts`, `src/core/reconciliation.ts`, `src/components/ConflictDialog.tsx`) remain in the repo for reference but are not wired into the runtime UI.

### Adding a new provider
1. Implement `AuthProvider` and/or `StorageProvider` in `src/services/providers/` (e.g., Supabase, Appwrite).
2. Keep provider-specific logic (polling intervals, auth refresh, token handling) inside that module.
3. Register the provider inside `providerConfig.ts` so `getAuthProvider`/`getStorageProvider` can instantiate it.
4. Ensure the storage adapter reads/writes `StoredData` via `serializeData`, `deserializeData`, and `validateData` to stay compatible with the rest of the app.

## Data Flow & Time Tracking
- Clicking a task adds a `ClickEvent { taskId, timestamp }` to `state.history`.
- When another task is clicked, the duration of the previous session is derived by comparing timestamps. No timers or intervals hold mutable state.
- `stopAllTasks` appends a synthetic click targeting `__STOP__` to mark "no active task".
- `resetAllTasks` clears `history` but preserves `tasks` so you can restart later.
- Because `history` is append-only, you can reconstruct any point in time, and cloud merges are deterministic.

Example timeline:
```
10:00 -> Click "Code"      -> Code runs
10:30 -> Click "Meeting"   -> Code gains 30m, Meeting runs
11:00 -> Click "Code"      -> Meeting gains 30m, Code resumes
11:15 -> (now)             -> Code total = 45m (30 + 15)
```

## Core Module API
```ts
import {
  TaskOperations,
  TaskQueries,
  InMemoryBackend,
  formatTime,
} from '@/core'

// Task mutations return brand-new TaskManagerState objects
const afterAdd = TaskOperations.addTask('Research', state)
const afterAddAndStart = TaskOperations.addAndStartTask('Write docs', state)
const afterStart = TaskOperations.startTask(taskId, state)
const afterRename = TaskOperations.updateTaskName(taskId, 'Review', state)
const afterDelete = TaskOperations.deleteTask(taskId, state)
const cleared = TaskOperations.deleteAllTasks(state)
const reset = TaskOperations.resetAllTasks(state)
const stopped = TaskOperations.stopAllTasks(state)

// Queries compute view models from immutable state + "now"
const tasks = TaskQueries.getAllTasks(state, Date.now())
const single = TaskQueries.getTask(taskId, state, Date.now())
const runningId = TaskQueries.getCurrentRunningTaskId(state)
const totalSeconds = TaskQueries.getTotalElapsedTime(state, Date.now())
const exists = TaskQueries.taskExists(taskId, state)

// Storage helpers
const storage = new InMemoryBackend()
await storage.save(reset)
const snapshot = await storage.load()

// Formatting
formatTime(3661) // => "1.0h"
```

`LocalStorageBackend` (in `src/services/providers/localStorageProvider.ts`) implements the same `StorageBackend` contract for browser use, and helper exports (`loadFromLocalStorage`, `saveToLocalStorage`, `loadSortModePreference`, `saveSortModePreference`) keep guest mode and UI preferences in sync.

## Data Types
```ts
interface TaskData {
  id: string
  name: string
}

interface ClickEvent {
  taskId: string
  timestamp: number
}

interface StoredData {
  tasks: TaskData[]
  history: ClickEvent[]
  lastModified: number
  sortMode?: 'total' | 'alphabetical'
}

interface Task {
  id: string
  name: string
  isRunning: boolean
  currentSessionTime: number
  lastSessionTime: number
  totalTime: number
}

interface TaskManagerState {
  tasks: TaskData[]
  history: ClickEvent[]
  lastModified: number
}
```

`serializeData`, `deserializeData`, and `validateData` (see `src/core/storageCore.ts`) enforce this shape across localStorage, Firebase, Google Drive, and automated tests.

## Cloud Providers
### Firebase (default)
- `FirebaseAuthProvider` wraps Firebase Auth with Google sign-in and persists the serialized `User` inside `localStorage`.
- `FirebaseStorageProvider` writes to `users/{userId}/tasks` in the Realtime Database. Payloads are serialized JSON strings produced by `serializeData` to guarantee cross-provider parity.
- `startListening` attaches a single `onValue` listener per user and suppresses duplicate updates by caching `lastModified`.

### Google Drive
- `GoogleAuthProvider` loads the `gapi` script, requests the `drive.file` scope, and shares ID tokens through `GoogleTokenStore`.
- `GoogleDriveStorageProvider` lazily creates (or reuses) a `ClockTasks` folder and a `tasks.json` file, serializes data via `serializeData`, and saves it through the Drive v3 REST API using `fetch`.
- A polling listener (`setInterval` every ~10 seconds) fetches the file contents and emits updates only when the serialized payload changes.

### Local Storage
- `LocalStorageBackend` and helper functions read/write a single JSON blob under the `clockTasks` key.
- Guest mode, read-only mode, and any cloud failures fall back to local storage so the UI never loses work.
- Sort preferences live alongside data (`sortMode` in `StoredData`) and are updated via `saveSortModePreference`.

## Testing
- **Vitest configuration**: see `vitest.config.ts` (React plugin, `happy-dom` environment, coverage via `@vitest/coverage-v8`).
- **Test suites**: `src/core/calculations*.test.ts`, `src/core/taskManager.test.ts`, `src/core/storage.test.ts`, `src/core/persistence.diagnostic.test.ts`, and `src/utils/storageHelpers.test.ts` cover the deterministic core logic and persistence helpers.
- Run `npm test` / `npm run test:ui` / `npm run test:coverage`. Each command builds the project first, so expect a short compilation step before Vitest starts.

## Technology Stack
- React 19.2 with hooks and the Babel React Compiler plugin (`babel-plugin-react-compiler`).
- TypeScript 5.9 with strict mode, bundler module resolution, path alias `@/*`, and extra safety flags (`noUncheckedSideEffectImports`, `noUnusedLocals`, etc.).
- Vite 5.4 (`npm start` on port 7428, `vite preview` for production bundles).
- Vitest 4 (`happy-dom`, UI, V8 coverage) for core-unit coverage.
- Firebase SDK 12 (Auth + Realtime Database) and Google Drive REST APIs reached via `fetch`.
- ESLint 9 flat config with `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, and `eslint-plugin-react-refresh`.
- Plain CSS (`App.css` + files in `src/styles/`).

## Browser Support
- Modern evergreen browsers (Chrome, Edge, Firefox, Safari) with ES2022 features. Vite targets ES2022 in `tsconfig.app.json`.
- Requires `localStorage`, `fetch`, and `URLSearchParams` support (all standard in current evergreen browsers).

## Contributing
- Keep business logic in `src/core`, UI glue in hooks/components, and provider-specific code inside `src/services/providers`.
- Use the `@/` path alias for imports and prefer TypeScript modules over relative backtracking.
- Reuse `createLogger('ModuleName')` when adding verbose logging in core/providers.
- Favor immutable updates; every `TaskOperations` function should return a brand-new `TaskManagerState`.
- Co-locate new Vitest suites next to the modules they validate.
- Run `npm run lint` and `npm test` before submitting changes; both commands are deterministic and already configured in `package.json`.

## Reuse Ideas
- ✅ **React web app** - the current UI at port 7428.
- 🟦 **Potential front-ends** - because the core is framework-agnostic, you can reuse it for a CLI, React Native app, Electron shell, VS Code panel, or even an Express API. These variants are not implemented yet, but the exports in `src/core/index.ts` make them straightforward future work.

## License
Private project - All rights reserved.

## Acknowledgments

Built with AI
