// Google Drive API service for storing tasks
declare global {
  interface Window {
    gapi: any
  }
}

class GoogleDriveService {
  private accessToken: string | null = null

  setAccessToken(token: string) {
    this.accessToken = token
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
        window.gapi.load('client', async () => {
          try {
            await window.gapi.client.init({
              apiKey: import.meta.env.VITE_GOOGLE_CLIENT_ID,
              discoveryDocs: ['https://www.googleapis.com/discovery/v1/apis/drive/v3/rest']
            })
            resolve(true)
          } catch (error) {
            reject(error)
          }
        })
      }
      script.onerror = () => reject(new Error('Failed to load gapi'))
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
      const response = await fetch(
        'https://www.googleapis.com/drive/v3/files?q=name%3D%27ClockTasks%27%20and%20mimeType%3D%27application%2Fvnd.google-apps.folder%27%20and%20trashed%3Dfalse&spaces=drive&fields=files(id)&pageSize=1',
        {
          headers: this.getHeaders()
        }
      )
      const data = await response.json()

      if (data.files && data.files.length > 0) {
        return data.files[0].id
      }

      // Create folder if it doesn't exist
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
      return createData.id
    } catch (error) {
      console.error('Error finding/creating app folder:', error)
      throw error
    }
  }

  async findOrCreateTasksFile(folderId: string): Promise<string> {
    try {
      const query = `name='tasks.json' and '${folderId}' in parents and trashed=false`
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(query)}&fields=files(id)&pageSize=1`,
        {
          headers: this.getHeaders()
        }
      )
      const data = await response.json()

      if (data.files && data.files.length > 0) {
        return data.files[0].id
      }

      // Create file if it doesn't exist
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
      await this.updateTasksFile(createData.id, { tasks: [], totalElapsedTime: 0 })

      return createData.id
    } catch (error) {
      console.error('Error finding/creating tasks file:', error)
      throw error
    }
  }

  async loadTasks(fileId: string): Promise<{ tasks: any[]; totalElapsedTime: number }> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
        {
          headers: this.getHeaders()
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to load tasks: ${response.statusText}`)
      }

      const data = await response.json()
      return data || { tasks: [], totalElapsedTime: 0 }
    } catch (error) {
      console.error('Error loading tasks from Drive:', error)
      return { tasks: [], totalElapsedTime: 0 }
    }
  }

  async updateTasksFile(fileId: string, data: any): Promise<void> {
    try {
      const response = await fetch(
        `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
        {
          method: 'PATCH',
          headers: {
            Authorization: `Bearer ${this.accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(data)
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to save tasks: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Error saving tasks to Drive:', error)
      throw error
    }
  }
}

export const googleDriveService = new GoogleDriveService()
