import { useEffect } from 'react'
import { googleDriveService } from '../services/googleDriveService'
import { logger } from '../utils/logger'
import { saveToLocalStorage } from '../core'
import type { User, StoredData } from '../types'
import type { TaskManagerState } from '../core'

export const useSyncEffect = (
  user: User | null,
  setState: (state: TaskManagerState) => void,
  setDriveFileId: (id: string | null) => void,
  setLastSyncTime: (time: number) => void
) => {
  // Initialize Google Drive on user login
  useEffect(() => {
    if (user) {
      googleDriveService.setAccessToken(user.accessToken)
      initializeGoogleDrive()
    }
  }, [user])

  const initializeGoogleDrive = async () => {
    if (!user) return
    try {
      const folderId = await googleDriveService.findOrCreateAppFolder()
      const fileId = await googleDriveService.findOrCreateTasksFile(folderId)
      setDriveFileId(fileId)
      const driveData = await googleDriveService.loadTasks(fileId)
      setState({
        tasks: driveData.tasks || [],
        clickHistory: driveData.clickHistory || [],
        lastModified: driveData.lastModified || Date.now()
      })
      setLastSyncTime(driveData.lastModified || Date.now())
    } catch (error) {
      console.error('Failed to initialize Google Drive:', error)
    }
  }

  // Sync to Google Drive
  const syncToGoogleDrive = async (fileId: string | null, dataToSync: StoredData) => {
    try {
      if (fileId && user) {
        await googleDriveService.updateTasksFile(fileId, dataToSync)
        setLastSyncTime(dataToSync.lastModified)
        saveToLocalStorage(dataToSync)
      }
    } catch (error) {
      logger.error('Failed to sync to Google Drive:', error)
      saveToLocalStorage(dataToSync)
    }
  }

  return { syncToGoogleDrive }
}
