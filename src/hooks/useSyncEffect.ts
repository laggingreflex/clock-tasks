import { useEffect, useRef } from 'react'
import { googleDriveService } from '@/services/googleDriveService'
import { createLogger } from '@/utils/logger'
import { saveToLocalStorage } from '@/core'
import type { User } from '@/types'
import type { StoredData } from '@/core'
import type { TaskManagerState } from '@/core'

const log = createLogger('useSyncEffect')

export const useSyncEffect = (
  user: User | null,
  setState: (state: TaskManagerState) => void,
  setDriveFileId: (id: string | null) => void,
  setLastSyncTime: (time: number) => void
) => {
  // Initialize Google Drive on user login
  useEffect(() => {
    if (user) {
      log.log(`🔐 User logged in: ${user.name}`)
      googleDriveService.setAccessToken(user.accessToken)
      initializeGoogleDrive()
    } else {
      log.log('🔓 User logged out')
      setDriveFileId(null)
    }
  }, [user])

  // Listen for storage changes in other tabs (cross-tab sync)
  useEffect(() => {
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'clockTasks' && user && !user.isGuest) {
        log.log('📡 Storage changed in another tab, refetching from Google Drive...')
        // Refetch from Google Drive to ensure consistency
        if (user) {
          refetchFromGoogleDrive()
        }
      }
    }

    window.addEventListener('storage', handleStorageChange)
    return () => window.removeEventListener('storage', handleStorageChange)
  }, [user])

  const initializeGoogleDrive = async () => {
    if (!user) return
    try {
      log.debug('Initializing Google Drive...')
      const folderId = await googleDriveService.findOrCreateAppFolder()
      log.debug('Found or created app folder:', folderId)

      const fileId = await googleDriveService.findOrCreateTasksFile(folderId)
      log.debug('Found or created tasks file:', fileId)

      setDriveFileId(fileId)
      const driveData = await googleDriveService.loadTasks(fileId)

      // CRITICAL: Google Drive overrides localStorage on first load
      // This is the single authoritative moment
      log.log(`☁️ GOOGLE DRIVE OVERRIDE: Loading ${driveData.tasks?.length || 0} tasks, ${driveData.history?.length || 0} clicks`)
      log.debug('Google Drive data overriding localStorage:', driveData)

      setState({
        tasks: driveData.tasks || [],
        history: driveData.history || [],
        lastModified: driveData.lastModified || Date.now()
      })
      setLastSyncTime(driveData.lastModified || Date.now())

      // Also sync back to localStorage to keep cache in sync
      saveToLocalStorage(driveData)

      // Store as our baseline for conflict detection
      lastSyncedDataRef.current = structuredClone(driveData)
      log.debug('Stored baseline data for conflict detection')
    } catch (error) {
      log.error('Failed to initialize Google Drive:', error)
    }
  }

  const refetchFromGoogleDrive = async () => {
    // Used by cross-tab sync to refetch data from Google Drive
    // when another tab has made changes
    if (!user) return
    try {
      // We need the fileId, but it may not be set yet. This is a limitation.
      // For now, log a warning. A better approach would be to store fileId in localStorage too.
      log.debug('Refetching from Google Drive after detecting external storage changes')
      // Re-initialize to get the file ID and fetch fresh data
      const folderId = await googleDriveService.findOrCreateAppFolder()
      const fileId = await googleDriveService.findOrCreateTasksFile(folderId)
      const driveData = await googleDriveService.loadTasks(fileId)

      log.log(`☁️ CROSS-TAB SYNC: Reloading ${driveData.tasks?.length || 0} tasks, ${driveData.history?.length || 0} clicks`)
      setState({
        tasks: driveData.tasks || [],
        history: driveData.history || [],
        lastModified: driveData.lastModified || Date.now()
      })
    } catch (error) {
      log.error('Failed to refetch from Google Drive:', error)
    }
  }

  // Store last synced state to detect real changes
  const lastSyncedDataRef = useRef<StoredData | null>(null)

  // Update ref when we successfully initialize
  useEffect(() => {
    // This will run after Google Drive initialization completes
    // We'll update the ref in the initialization function
  }, [])

  // Check for conflicts before pushing
  const checkForConflicts = async (fileId: string, localData: StoredData): Promise<{ hasConflict: boolean; serverData?: StoredData }> => {
    try {
      log.debug('Checking for conflicts with server...')
      const serverData = await googleDriveService.loadTasks(fileId)

      // If we have a lastSynced reference, check if server data differs from what we last synced
      // This means another client made changes
      if (lastSyncedDataRef.current) {
        const serverChanged =
          serverData.history.length !== lastSyncedDataRef.current.history.length ||
          serverData.tasks.length !== lastSyncedDataRef.current.tasks.length ||
          JSON.stringify(serverData.history) !== JSON.stringify(lastSyncedDataRef.current.history) ||
          JSON.stringify(serverData.tasks) !== JSON.stringify(lastSyncedDataRef.current.tasks)

        if (serverChanged) {
          log.warn(`⚠️ CONFLICT DETECTED: Server data has changed since last sync`)
          log.debug(`Server: ${serverData.tasks.length} tasks, ${serverData.history.length} clicks`)
          log.debug(`Last synced: ${lastSyncedDataRef.current.tasks.length} tasks, ${lastSyncedDataRef.current.history.length} clicks`)
          return { hasConflict: true, serverData }
        }
      } else {
        // First sync, no reference yet - check timestamp as fallback
        log.debug(`Conflict check: Server lastModified=${serverData.lastModified}, Local lastModified=${localData.lastModified}`)
        if (serverData.lastModified > localData.lastModified) {
          log.warn(`⚠️ CONFLICT DETECTED: Server data (${new Date(serverData.lastModified).toISOString()}) is newer than local (${new Date(localData.lastModified).toISOString()})`)
          return { hasConflict: true, serverData }
        }
      }

      log.debug('No conflict detected, local data is current')
      return { hasConflict: false }
    } catch (error) {
      log.error('Failed to check for conflicts:', error)
      return { hasConflict: false }
    }
  }

  // Show conflict resolution dialog
  const showConflictDialog = (serverData: StoredData, localData: StoredData): Promise<'overwrite' | 'discard'> => {
    return new Promise((resolve) => {
      const serverTime = new Date(serverData.lastModified).toLocaleString()
      const localTime = new Date(localData.lastModified).toLocaleString()

      const message = `⚠️ Sync Conflict Detected!\n\nServer data has changed since your last sync.\n\nServer last modified: ${serverTime}\nYour local changes: ${localTime}\n\nWhat would you like to do?\n\n- OK: Overwrite server data with your local changes\n- Cancel: Keep server data and discard your local changes`

      if (confirm(message)) {
        log.log('👤 User chose to OVERWRITE server data')
        resolve('overwrite')
      } else {
        log.log('👤 User chose to DISCARD local changes')
        resolve('discard')
      }
    })
  }

  // Sync to Google Drive and localStorage
  const syncToGoogleDrive = async (fileId: string | null, dataToSync: StoredData) => {
    try {
      if (fileId && user) {
        log.log(`🔄 Starting sync to Google Drive...`)
        // STEP 1: Check for conflicts before pushing
        log.debug(`Checking for conflicts before sync...`)
        const { hasConflict, serverData } = await checkForConflicts(fileId, dataToSync)

        if (hasConflict && serverData) {
          // STEP 2: Show conflict dialog and wait for user choice
          const userChoice = await showConflictDialog(serverData, dataToSync)

          if (userChoice === 'discard') {
            // User chose to discard local changes, use server data instead
            log.log(`📥 Discarding local changes, keeping server data`)
            setState({
              tasks: serverData.tasks || [],
              history: serverData.history || [],
              lastModified: serverData.lastModified || Date.now()
            })
            setLastSyncTime(serverData.lastModified || Date.now())
            saveToLocalStorage(serverData)
            return
          }
          // If 'overwrite', continue with the push below
        }

        // STEP 3: Push to Google Drive
        log.debug(`Syncing to Google Drive (fileId: ${fileId})...`)
        await googleDriveService.updateTasksFile(fileId, dataToSync)
        log.log(`☁️ Google Drive sync: ${dataToSync.tasks.length} tasks, ${dataToSync.history.length} clicks`)
        setLastSyncTime(dataToSync.lastModified)

        // STEP 4: Also save to localStorage (cache) simultaneously
        saveToLocalStorage(dataToSync)
        log.debug(`📱 LocalStorage cache updated`)

        // STEP 5: Update our baseline for next conflict check
        lastSyncedDataRef.current = structuredClone(dataToSync)
        log.debug('Updated baseline data for conflict detection')
      } else {
        // Guest user: save to localStorage only
        log.debug('Syncing locally (no Google Drive fileId or user)')
        saveToLocalStorage(dataToSync)
        log.log(`📱 LocalStorage save: ${dataToSync.tasks.length} tasks, ${dataToSync.history.length} clicks`)
      }
    } catch (error) {
      log.error('Failed to sync to Google Drive:', error)
      log.log('📱 Falling back to local storage only')
      // Always fallback to localStorage so we don't lose data
      saveToLocalStorage(dataToSync)
    }
  }

  return { syncToGoogleDrive }
}
