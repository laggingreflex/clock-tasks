/**
 * Google Drive Storage Provider
 * Implements StorageProvider interface using Google Drive API
 * Requires access token from GoogleAuthProvider
 */

import { createLogger } from '@/utils/logger'
import type { StoredData } from '@/core'
import { serializeData, deserializeData, validateData } from '@/core/storageCore'
import type { StorageProvider, TokenStore } from './types'

const log = createLogger('GoogleDriveStorageProvider')

type DataCallback = (data: StoredData) => void

/**
 * Simple in-memory token store for sharing tokens between auth and storage providers
 */
class GoogleTokenStore implements TokenStore {
  private token: string | null = null

  setAccessToken(token: string): void {
    this.token = token
  }

  getAccessToken(): string | null {
    return this.token
  }

  clearToken(): void {
    this.token = null
  }
}

export class GoogleDriveStorageProvider implements StorageProvider {
  private tokenStore: TokenStore
  private currentUserId: string | null = null
  private folderId: string | null = null
  private fileId: string | null = null
  private pollingInterval: ReturnType<typeof setInterval> | null = null

  constructor(tokenStore?: TokenStore) {
    this.tokenStore = tokenStore || new GoogleTokenStore()
  }

  setUserId(userId: string): void {
    if (this.currentUserId !== userId) {
      log.log(`🔐 Setting user ID: ${userId}`)

      // Clean up old state
      if (this.currentUserId) {
        this.stopListening()
      }

      this.currentUserId = userId
    }
  }

  private getAuthHeader(): Record<string, string> {
    const token = this.tokenStore.getAccessToken()
    if (!token) {
      throw new Error('No access token available. User must be authenticated with Google.')
    }
    return {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  }

  async save(data: StoredData): Promise<void> {
    try {
      if (!this.currentUserId) {
        log.warn('Cannot save to Google Drive: no user ID set')
        return
      }

      // Ensure folder and file exist
      await this.ensureClockTasksFolder()

      const serialized = serializeData(data)
      const fileContent = JSON.stringify(serialized, null, 2)

      log.debug(`Saving to Google Drive: ${data.tasks.length} tasks, ${data.history.length} clicks`)

      if (this.fileId) {
        // Update existing file
        await this.updateFile(this.fileId, fileContent)
      } else {
        // Create new file
        await this.createFile('tasks.json', fileContent)
      }

      log.log('☁️ Saved to Google Drive')
    } catch (error) {
      log.error('Failed to save to Google Drive:', error)
      throw error
    }
  }

  async load(): Promise<StoredData> {
    try {
      if (!this.currentUserId) {
        throw new Error('No user ID set. Call setUserId() first.')
      }

      log.debug('Loading tasks from Google Drive...')

      await this.ensureClockTasksFolder()

      if (!this.fileId) {
        log.log('☁️ No data in Google Drive, initializing empty')
        const emptyData: StoredData = {
          tasks: [],
          history: [],
          lastModified: Date.now()
        }
        await this.save(emptyData)
        return emptyData
      }

      const fileContent = await this.readFile(this.fileId)
      const serialized = JSON.parse(fileContent)
      const data = deserializeData(serialized)

      if (!validateData(data)) {
        log.error('Invalid data from Google Drive:', data)
        throw new Error('Invalid data structure from Google Drive')
      }

      log.log(`☁️ Loaded from Google Drive: ${data.tasks.length} tasks, ${data.history.length} clicks`)
      return data
    } catch (error) {
      log.error('Failed to load from Google Drive:', error)
      throw error
    }
  }

  async clear(): Promise<void> {
    try {
      if (this.fileId) {
        await this.deleteFile(this.fileId)
        this.fileId = null
        log.log('☁️ Cleared Google Drive data')
      }
    } catch (error) {
      log.error('Failed to clear Google Drive:', error)
      throw error
    }
  }

  startListening(callback: DataCallback): void {
    try {
      if (!this.currentUserId) {
        log.warn('Cannot start listening: no user ID set')
        return
      }

      log.log('📡 Starting Google Drive polling listener (10s interval)')

      // Stop any existing polling
      this.stopListening()

      let lastKnownContent: string | null = null

      // Poll Google Drive for changes every 10 seconds
      this.pollingInterval = setInterval(async () => {
        try {
          if (!this.fileId) return

          const fileContent = await this.readFile(this.fileId)

          // Only call callback if content changed
          if (fileContent !== lastKnownContent) {
            lastKnownContent = fileContent
            const serialized = JSON.parse(fileContent)
            const data = deserializeData(serialized)

            if (!validateData(data)) {
              log.error('Invalid data from Google Drive polling:', data)
              return
            }

            log.log(`📡 Google Drive update: ${data.tasks.length} tasks, ${data.history.length} clicks`)
            callback(data)
          }
        } catch (error) {
          log.error('Error in polling listener:', error)
        }
      }, 10000)

      log.log('✅ Google Drive listener started')
    } catch (error) {
      log.error('Failed to start Google Drive listener:', error)
      throw error
    }
  }

  stopListening(): void {
    if (this.pollingInterval) {
      log.log('🔇 Stopping Google Drive listener')
      clearInterval(this.pollingInterval)
      this.pollingInterval = null
    }
  }

  clearUser(): void {
    log.log('🔓 Clearing user')
    this.stopListening()
    this.currentUserId = null
    this.folderId = null
    this.fileId = null
  }

  isListening(): boolean {
    return this.pollingInterval !== null
  }

  private async ensureClockTasksFolder(): Promise<void> {
    if (this.folderId) {
      return // Already initialized
    }

    try {
      // Try to find existing folder
      const folderQuery = `name='ClockTasks' and mimeType='application/vnd.google-apps.folder' and trashed=false`
      const response = await this.apiCall('GET', 'https://www.googleapis.com/drive/v3/files', {
        q: folderQuery,
        spaces: 'drive',
        fields: 'files(id)'
      })

      const folders = response.files || []

      if (folders.length > 0) {
        this.folderId = folders[0].id
        log.log(`📁 Found existing ClockTasks folder: ${this.folderId}`)
      } else {
        // Create new folder
        const createFolderResponse = await this.apiCall('POST', 'https://www.googleapis.com/drive/v3/files', {
          name: 'ClockTasks',
          mimeType: 'application/vnd.google-apps.folder'
        })
        this.folderId = createFolderResponse.id
        log.log(`📁 Created new ClockTasks folder: ${this.folderId}`)
      }

      // Now find or create tasks.json file
      await this.ensureTasksFile()
    } catch (error) {
      log.error('Failed to ensure ClockTasks folder:', error)
      throw error
    }
  }

  private async ensureTasksFile(): Promise<void> {
    if (!this.folderId) {
      throw new Error('Folder ID not set')
    }

    try {
      const fileQuery = `name='tasks.json' and '${this.folderId}' in parents and trashed=false`
      const response = await this.apiCall('GET', 'https://www.googleapis.com/drive/v3/files', {
        q: fileQuery,
        spaces: 'drive',
        fields: 'files(id)'
      })

      const files = response.files || []

      if (files.length > 0) {
        this.fileId = files[0].id
        log.debug(`📄 Found existing tasks.json: ${this.fileId}`)
      }
      // If no file exists, it will be created on first save
    } catch (error) {
      log.error('Failed to ensure tasks.json file:', error)
      throw error
    }
  }

  private async createFile(filename: string, content: string): Promise<void> {
    if (!this.folderId) {
      throw new Error('Folder ID not set')
    }

    try {
      const metadata = {
        name: filename,
        parents: [this.folderId]
      }

      const response = await this.apiCall('POST', 'https://www.googleapis.com/drive/v3/files', metadata)
      this.fileId = response.id
      log.debug(`📄 Created new file: ${this.fileId}`)

      // Upload content
      if (this.fileId) {
        await this.updateFile(this.fileId, content)
      }
    } catch (error) {
      log.error('Failed to create file:', error)
      throw error
    }
  }

  private async updateFile(fileId: string, content: string): Promise<void> {
    try {
      await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: this.getAuthHeader(),
        body: content
      })
      log.debug(`✏️ Updated file: ${fileId}`)
    } catch (error) {
      log.error('Failed to update file:', error)
      throw error
    }
  }

  private async readFile(fileId: string): Promise<string> {
    try {
      const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
        method: 'GET',
        headers: this.getAuthHeader()
      })

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      return await response.text()
    } catch (error) {
      log.error('Failed to read file:', error)
      throw error
    }
  }

  private async deleteFile(fileId: string): Promise<void> {
    try {
      await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
        method: 'DELETE',
        headers: this.getAuthHeader()
      })
      log.debug(`🗑️ Deleted file: ${fileId}`)
    } catch (error) {
      log.error('Failed to delete file:', error)
      throw error
    }
  }

  private async apiCall(
    method: string,
    url: string,
    data?: Record<string, any>
  ): Promise<any> {
    const options: RequestInit = {
      method,
      headers: this.getAuthHeader()
    }

    if (data) {
      if (method === 'GET') {
        // Add query parameters
        const params = new URLSearchParams()
        for (const [key, value] of Object.entries(data)) {
          params.append(key, String(value))
        }
        const fullUrl = `${url}?${params.toString()}`
        const response = await fetch(fullUrl, options)
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }
        return await response.json()
      } else {
        options.body = JSON.stringify(data)
      }
    }

    const response = await fetch(url, options)
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }

    return await response.json()
  }
}
