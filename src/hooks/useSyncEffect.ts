import { useEffect, useRef, useMemo } from 'react'
import { getStorageProvider } from '@/services/providers'
import { createLogger } from '@/utils/logger'
import { saveToLocalStorage } from '@/core'
import type { User } from '@/types'
import type { StoredData } from '@/core'
import type { TaskManagerState } from '@/core'
import { useAppOptions } from './OptionsContext'

const log = createLogger('useSyncEffect')

export const useSyncEffect = (
  user: User | null,
  setState: (state: TaskManagerState) => void,
  setDriveFileId: (id: string | null) => void,
  setLastSyncTime: (time: number) => void
) => {
  const isInitializedRef = useRef(false)
  // Memoize storage provider to prevent re-creation and effect churn
  const storageProvider = useMemo(() => getStorageProvider(), [])
  const { readOnly } = useAppOptions()

  // Initialize storage provider on user login
  useEffect(() => {
    if (user && !user.isGuest) {
      // Log only once per login session
      if (!isInitializedRef.current) {
        log.log(`🔐 User logged in: ${user.name}`)
      }
      storageProvider.setUserId(user.id)
      initializeStorage()
    } else if (user?.isGuest) {
      log.log('👤 Guest mode - using localStorage only')
      storageProvider.clearUser()
      isInitializedRef.current = false
    } else {
      log.log('🔓 User logged out')
      storageProvider.clearUser()
      isInitializedRef.current = false
    }

    return () => {
      // Cleanup listener on unmount or user change
      storageProvider.stopListening()
    }
  }, [user])

  const initializeStorage = async () => {
    if (!user || user.isGuest || isInitializedRef.current) return

    try {
      log.debug('Initializing cloud storage sync...')

      // Load initial data from storage provider
      const cloudData = await storageProvider.load()

      // Cloud storage is authoritative source - override localStorage
      log.log(`☁️ CLOUD OVERRIDE: Loading ${cloudData.tasks?.length || 0} tasks, ${cloudData.history?.length || 0} clicks`)

      setState({
        tasks: cloudData.tasks || [],
        history: cloudData.history || [],
        lastModified: cloudData.lastModified || Date.now()
      })
      setLastSyncTime(cloudData.lastModified || Date.now())

      // Also sync to localStorage as cache
      saveToLocalStorage(cloudData)

      // Start real-time listener for updates
      storageProvider.startListening((updatedData) => {
        log.log(`📡 REAL-TIME UPDATE: ${updatedData.tasks.length} tasks, ${updatedData.history.length} clicks`)

        setState({
          tasks: updatedData.tasks,
          history: updatedData.history,
          lastModified: updatedData.lastModified
        })
        setLastSyncTime(updatedData.lastModified)

        // Keep localStorage in sync
        saveToLocalStorage(updatedData)
      })

      setDriveFileId('cloud') // Set a marker that we're using cloud storage
      isInitializedRef.current = true
      log.log('✅ Cloud storage real-time sync active')
    } catch (error) {
      log.error('Failed to initialize cloud storage:', error)
    }
  }

  // Sync to cloud storage (Firebase, Google Drive, etc.)
  const syncToCloud = async (fileId: string | null, dataToSync: StoredData) => {
    try {
      if (readOnly) {
        log.debug('Read-only mode: skipping persistence (cloud/local)')
        return
      }
      if (fileId === 'cloud' && user && !user.isGuest) {
        log.debug(`🔄 Syncing to cloud storage: ${dataToSync.tasks.length} tasks, ${dataToSync.history.length} clicks`)

        // Simply save to cloud storage - no reconciliation needed!
        // Cloud provider handles conflicts with last-write-wins
        await storageProvider.save(dataToSync)

        // The real-time listener will update other tabs/devices automatically
        log.log(`☁️ Cloud storage synced`)
        setLastSyncTime(dataToSync.lastModified)

        // Also save to localStorage (cache)
        saveToLocalStorage(dataToSync)
      } else {
        // Guest user: save to localStorage only
        log.debug('Syncing locally (guest mode)')
        saveToLocalStorage(dataToSync)
        log.log(`📱 LocalStorage save: ${dataToSync.tasks.length} tasks, ${dataToSync.history.length} clicks`)
      }
    } catch (error) {
      log.error('Failed to sync to cloud storage:', error)
      log.log('📱 Falling back to local storage only')
      // Always fallback to localStorage so we don't lose data
      if (!readOnly) saveToLocalStorage(dataToSync)
    }
  }

  return { syncToGoogleDrive: syncToCloud }
}
