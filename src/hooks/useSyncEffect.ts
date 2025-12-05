import { useEffect, useRef } from 'react'
import { firebaseService } from '@/services/firebaseService'
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
  const isInitializedRef = useRef(false)

  // Initialize Firebase on user login
  useEffect(() => {
    if (user && !user.isGuest) {
      log.log(`🔐 User logged in: ${user.name}`)
      firebaseService.setUserId(user.id)
      initializeFirebase()
    } else if (user?.isGuest) {
      log.log('👤 Guest mode - using localStorage only')
      firebaseService.clearUser()
      isInitializedRef.current = false
    } else {
      log.log('🔓 User logged out')
      firebaseService.clearUser()
      isInitializedRef.current = false
    }

    return () => {
      // Cleanup listener on unmount or user change
      firebaseService.stopListening()
    }
  }, [user])

  const initializeFirebase = async () => {
    if (!user || user.isGuest || isInitializedRef.current) return

    try {
      log.debug('Initializing Firebase sync...')

      // Load initial data from Firebase
      const firebaseData = await firebaseService.loadTasks()

      // Firebase is authoritative source - override localStorage
      log.log(`☁️ FIREBASE OVERRIDE: Loading ${firebaseData.tasks?.length || 0} tasks, ${firebaseData.history?.length || 0} clicks`)

      setState({
        tasks: firebaseData.tasks || [],
        history: firebaseData.history || [],
        lastModified: firebaseData.lastModified || Date.now()
      })
      setLastSyncTime(firebaseData.lastModified || Date.now())

      // Also sync to localStorage as cache
      saveToLocalStorage(firebaseData)

      // Start real-time listener for updates
      firebaseService.startListening((updatedData) => {
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

      setDriveFileId('firebase') // Set a marker that we're using Firebase
      isInitializedRef.current = true
      log.log('✅ Firebase real-time sync active')
    } catch (error) {
      log.error('Failed to initialize Firebase:', error)
    }
  }

  // Sync to Firebase (replaces complex Google Drive reconciliation)
  const syncToFirebase = async (fileId: string | null, dataToSync: StoredData) => {
    try {
      if (fileId === 'firebase' && user && !user.isGuest) {
        log.debug(`🔄 Syncing to Firebase: ${dataToSync.tasks.length} tasks, ${dataToSync.history.length} clicks`)

        // Simply save to Firebase - no reconciliation needed!
        // Firebase handles conflicts with last-write-wins
        await firebaseService.saveTasks(dataToSync)

        // The real-time listener will update other tabs/devices automatically
        log.log(`☁️ Firebase synced`)
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
      log.error('Failed to sync to Firebase:', error)
      log.log('📱 Falling back to local storage only')
      // Always fallback to localStorage so we don't lose data
      saveToLocalStorage(dataToSync)
    }
  }

  return { syncToGoogleDrive: syncToFirebase }
}
