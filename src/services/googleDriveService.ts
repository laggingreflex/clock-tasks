// Google Drive API service for storing tasks
import { createLogger } from '@/utils/logger'
import type { StoredData } from '@/core'
import { serializeData, deserializeData, validateData } from '@/core/storageCore'

declare global {
  interface Window {
    gapi: any
  }
}

const log = createLogger('GoogleDriveService')

class GoogleDriveService {
  private accessToken: string | null = null

  setAccessToken(token: string) {
    this.accessToken = token
    log.debug('Access token set')
    // Also initialize gapi
    if (window.gapi) {
      window.gapi.client.setToken({ access_token: token })
    }
  }

  async initializeGapi() {
    return new Promise((resolve, reject) => {
      const script = document.createElement('script')
      script.src = 'https://apis.google.com/js/api.js'
      script.onload = () => {
        log.debug('gapi script loaded, initializing client...')
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              apiKey: import.meta.env.VITE_GOOGLE_CLIENT_ID,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
            })
            log.log('☁️ Google API initialized')
            resolve(true)
          } catch (error) {
            log.error('Failed to initialize Google API:', error)
            reject(error)
          }
        })
      }
      script.onerror = () => {
        const err = new Error('Failed to load gapi')
        log.error('Failed to load gapi script:', err)
        reject(err)
      }
      document.head.appendChild(script)
    })
  }

  private getHeaders() {
    return {
      Authorization: `Bearer ${this.accessToken}`,
      'Content-Type': 'application/json'
    }
  }

  async findOrCreateAppFolder(): Promise<string> {
    try {
      log.debug('Looking for ClockTasks folder...')
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files?q=name%3D%27ClockTasks%27%20and%20mimeType%3D%27application%2Fvnd.google-apps.folder%27%20and%20trashed%3Dfalse&spaces=drive&fields=files(id)&pageSize=1',
        {
          headers: this.getHeaders()
        }
      )
      const data = await response.json()

      if (data.files && data.files.length > 0) {
        log.log(`☁️ Found ClockTasks folder: ${data.files[0].id}`)
        return data.files[0].id
      }

      // Create folder if it doesn't exist
      log.debug('ClockTasks folder not found, creating...')
      const createResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files?fields=id',
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            name: 'ClockTasks',
            mimeType: 'application/vnd.google-apps.folder'
          })
        }
      )
      const createData = await createResponse.json()
      log.log(`☁️ Created ClockTasks folder: ${createData.id}`)
      return createData.id
    } catch (error) {
      log.error('Error finding/creating app folder:', error)
      throw error
    }
  }

  async findOrCreateTasksFile(folderId: string): Promise<string> {
    try {
      log.debug('Looking for tasks.json file...')
      const query = `name='tasks.json' and '${folderId}' in parents and trashed=false`
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=1`,
        {
          headers: this.getHeaders()
        }
      )
      const data = await response.json()

      if (data.files && data.files.length > 0) {
        log.log(`☁️ Found tasks.json file: ${data.files[0].id}`)
        return data.files[0].id
      }

      // Create file if it doesn't exist
      log.debug('tasks.json not found, creating...')
      const createResponse = await fetch(
        'https://www.googleapis.com/drive/v3/files?fields=id',
        {
          method: 'POST',
          headers: this.getHeaders(),
          body: JSON.stringify({
            name: 'tasks.json',
            parents: [folderId],
            mimeType: 'application/json'
          })
        }
      )
      const createData = await createResponse.json()

      // Initialize with empty tasks
      await this.updateTasksFile(createData.id, { tasks: [], history: [], lastModified: Date.now() })

      log.log(`☁️ Created tasks.json file: ${createData.id}`)
      return createData.id
    } catch (error) {
      log.error('Error finding/creating tasks file:', error)
      throw error
    }
  }

  async loadTasks(fileId: string): Promise<StoredData> {
    try {
      log.debug('Loading tasks from Google Drive...')
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: this.getHeaders()
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to load tasks: ${response.statusText}`)
      }

      const raw = await response.text()
      const data = validateData(deserializeData(raw))
      log.log(`☁️ Loaded from Google Drive: ${data.tasks?.length || 0} tasks, ${data.history?.length || 0} clicks`)
      return data
    } catch (error) {
      log.error('Error loading tasks from Drive:', error)
      return { tasks: [], history: [], lastModified: Date.now() }
    }
  }

  async updateTasksFile(fileId: string, data: StoredData): Promise<void> {
    try {
      log.debug(`Syncing to Google Drive: ${data.tasks?.length || 0} tasks, ${data.history?.length || 0} clicks`)
      const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: serializeData(validateData(data))
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to save tasks: ${response.statusText}`)
      }
      log.log('☁️ Successfully synced to Google Drive')
    } catch (error) {
      log.error('Error saving tasks to Drive:', error)
      throw error
    }
  }
}

export const googleDriveService = new GoogleDriveService()
