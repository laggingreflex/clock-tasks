import { useEffect } from 'react'
import { googleDriveService } from '../services/googleDriveService'
import { createLogger } from '../utils/logger'
import { saveToLocalStorage } from '../core'
import type { User, StoredData } from '../types'
import type { TaskManagerState } from '../core'

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
    }
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
      log.log(`☁️ Google Drive initialized: ${driveData.tasks?.length || 0} tasks, ${driveData.clickHistory?.length || 0} clicks`)
      
      setState({
        tasks: driveData.tasks || [],
        clickHistory: driveData.clickHistory || [],
        lastModified: driveData.lastModified || Date.now()
      })
      setLastSyncTime(driveData.lastModified || Date.now())
    } catch (error) {
      log.error('Failed to initialize Google Drive:', error)
    }
  }

  // Sync to Google Drive
  const syncToGoogleDrive = async (fileId: string | null, dataToSync: StoredData) => {
    try {
      if (fileId && user) {
        log.debug(`Syncing to Google Drive (fileId: ${fileId})...`)
        await googleDriveService.updateTasksFile(fileId, dataToSync)
        log.log(`☁️ Google Drive sync: ${dataToSync.tasks.length} tasks, ${dataToSync.clickHistory.length} clicks`)
        setLastSyncTime(dataToSync.lastModified)
        saveToLocalStorage(dataToSync)
      } else {
        log.debug('Syncing locally (no Google Drive fileId)')
        saveToLocalStorage(dataToSync)
      }
    } catch (error) {
      log.error('Failed to sync to Google Drive:', error)
      log.log('📱 Falling back to local storage')
      saveToLocalStorage(dataToSync)
    }
  }

  return { syncToGoogleDrive }
}
