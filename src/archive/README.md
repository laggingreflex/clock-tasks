# Archived Files

This directory contains files that were deprecated during the migration from Google Drive to Firebase.

## Deprecated Files

- **googleDriveService.ts** - Old Google Drive integration service (replaced by firebaseService.ts)
- **reconciliation.ts** - Three-way merge conflict resolution logic (no longer needed with Firebase real-time sync)
- **reconciliation.test.ts** - Tests for the reconciliation logic
- **authHelpers.ts** - Google OAuth helpers (replaced by firebaseAuthHelpers.ts)
- **authHelpers.test.ts** - Tests for old auth helpers

## Migration Summary

The app has been migrated from:
- **Google Drive REST API** → **Firebase Realtime Database**
- **Manual polling/reconciliation** → **Real-time listeners**
- **Complex three-way merge** → **Server-side conflict resolution (last-write-wins)**
- **@react-oauth/google** → **Firebase Authentication**

These files are kept for reference but are no longer used in the application.
