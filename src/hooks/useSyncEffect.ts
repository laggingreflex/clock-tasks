import { useEffect, useRef } from 'react'
import { googleDriveService } from '@/services/googleDriveService'
import { createLogger } from '@/utils/logger'
import { saveToLocalStorage, reconcile } from '@/core'
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

  // Check for conflicts and intelligently reconcile
  const reconcileWithServer = async (fileId: string, localData: StoredData): Promise<StoredData> => {
    try {
      log.debug('Checking for divergence with server...')
      const serverData = await googleDriveService.loadTasks(fileId)

      // If server data is identical to what we last synced, no need to reconcile
      if (lastSyncedDataRef.current) {
        const serverChanged =
          serverData.history.length !== lastSyncedDataRef.current.history.length ||
          serverData.tasks.length !== lastSyncedDataRef.current.tasks.length ||
          JSON.stringify(serverData.history) !== JSON.stringify(lastSyncedDataRef.current.history) ||
          JSON.stringify(serverData.tasks) !== JSON.stringify(lastSyncedDataRef.current.tasks)

        if (!serverChanged) {
          log.debug('✅ No server changes detected, local data is current')
          return localData
        }

        log.warn(`⚠️ Divergence detected: Server has changed since last sync`)
      }

      // Use three-way merge to intelligently reconcile
      const baseline = lastSyncedDataRef.current || { tasks: [], history: [], lastModified: 0 }
      const { data: mergedData, conflicts, summary } = reconcile(localData, serverData, baseline)

      if (conflicts.length > 0) {
        log.warn(`⚠️ ${conflicts.length} conflict(s) found during reconciliation:`)
        conflicts.forEach(c => {
          log.warn(`  - ${c.type}: "${c.taskName}"`)
        })
        log.log(`   Defaulting to local version for all conflicts`)
      }

      log.log(`✅ Reconciliation complete: ${summary.tasksKept} tasks, ${summary.clicksAdded} clicks added from server`)
      return mergedData
    } catch (error) {
      log.error('Failed to reconcile with server:', error)
      // On error, trust local data
      return localData
    }
  }

  // Sync to Google Drive and localStorage
  const syncToGoogleDrive = async (fileId: string | null, dataToSync: StoredData) => {
    try {
      if (fileId && user) {
        log.log(`🔄 Starting sync to Google Drive...`)
        
        // Intelligently reconcile local and server data
        log.debug(`Reconciling with server...`)
        const reconciledData = await reconcileWithServer(fileId, dataToSync)

        // Push reconciled data to Google Drive
        log.debug(`Syncing to Google Drive (fileId: ${fileId})...`)
        await googleDriveService.updateTasksFile(fileId, reconciledData)
        log.log(`☁️ Google Drive sync: ${reconciledData.tasks.length} tasks, ${reconciledData.history.length} clicks`)
        setLastSyncTime(reconciledData.lastModified)

        // Update state if reconciliation produced different data
        if (JSON.stringify(reconciledData) !== JSON.stringify(dataToSync)) {
          log.log(`📝 Updating local state with reconciled data`)
          setState({
            tasks: reconciledData.tasks,
            history: reconciledData.history,
            lastModified: reconciledData.lastModified
          })
        }

        // Also save to localStorage (cache) simultaneously
        saveToLocalStorage(reconciledData)
        log.debug(`📱 LocalStorage cache updated`)

        // Update our baseline for next sync
        lastSyncedDataRef.current = structuredClone(reconciledData)
        log.debug('Updated baseline data')
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
