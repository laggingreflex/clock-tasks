// Firebase Realtime Database service for storing and syncing tasks
import { ref, set, onValue, off, get } from 'firebase/database'
import { database } from './firebaseConfig'
import { createLogger } from '@/utils/logger'
import type { StoredData } from '@/core'
import { serializeData, deserializeData, validateData } from '@/core/storageCore'

const log = createLogger('FirebaseService')

type DataCallback = (data: StoredData) => void

class FirebaseService {
  private currentUserId: string | null = null
  private unsubscribe: (() => void) | null = null

  /**
   * Set the current user ID for Firebase operations
   */
  setUserId(userId: string) {
    if (this.currentUserId !== userId) {
      log.log(`🔐 Setting user ID: ${userId}`)

      // Clean up old listener if user changed
      if (this.currentUserId) {
        this.stopListening()
      }

      this.currentUserId = userId
    }
  }

  /**
   * Get the Firebase path for the current user's tasks
   */
  private getUserTasksPath(): string {
    if (!this.currentUserId) {
      throw new Error('No user ID set. Call setUserId() first.')
    }
    return `users/${this.currentUserId}/tasks`
  }

  /**
   * Save tasks data to Firebase
   * This will trigger real-time listeners in all connected clients
   */
  async saveTasks(data: StoredData): Promise<void> {
    try {
      if (!this.currentUserId) {
        log.warn('Cannot save to Firebase: no user ID set')
        return
      }

      const path = this.getUserTasksPath()
      const tasksRef = ref(database, path)

      // Serialize data before saving
      const serialized = serializeData(data)

      log.debug(`Saving to Firebase: ${data.tasks.length} tasks, ${data.history.length} clicks`)
      await set(tasksRef, serialized)
      log.log('☁️ Saved to Firebase')
    } catch (error) {
      log.error('Failed to save to Firebase:', error)
      throw error
    }
  }

  /**
   * Load tasks data from Firebase once (no real-time updates)
   */
  async loadTasks(): Promise<StoredData> {
    try {
      if (!this.currentUserId) {
        throw new Error('No user ID set. Call setUserId() first.')
      }

      const path = this.getUserTasksPath()
      const tasksRef = ref(database, path)

      log.debug('Loading tasks from Firebase...')
      const snapshot = await get(tasksRef)

      if (!snapshot.exists()) {
        log.log('☁️ No data in Firebase, initializing empty')
        const emptyData: StoredData = {
          tasks: [],
          history: [],
          lastModified: Date.now()
        }
        await this.saveTasks(emptyData)
        return emptyData
      }

      const serialized = snapshot.val()
      const data = deserializeData(serialized)

      if (!validateData(data)) {
        log.error('Invalid data from Firebase:', data)
        throw new Error('Invalid data structure from Firebase')
      }

      log.log(`☁️ Loaded from Firebase: ${data.tasks.length} tasks, ${data.history.length} clicks`)
      return data
    } catch (error) {
      log.error('Failed to load from Firebase:', error)
      throw error
    }
  }

  /**
   * Start listening for real-time updates from Firebase
   * The callback will be called whenever data changes in Firebase
   */
  startListening(callback: DataCallback): void {
    try {
      if (!this.currentUserId) {
        log.warn('Cannot start listening: no user ID set')
        return
      }

      // Stop any existing listener
      this.stopListening()

      const path = this.getUserTasksPath()
      const tasksRef = ref(database, path)

      log.log('📡 Starting Firebase real-time listener')

      // Set up the real-time listener
      onValue(tasksRef, (snapshot) => {
        if (!snapshot.exists()) {
          log.debug('Firebase snapshot is empty')
          return
        }

        try {
          const serialized = snapshot.val()
          const data = deserializeData(serialized)

          if (!validateData(data)) {
            log.error('Invalid data from Firebase listener:', data)
            return
          }

          log.log(`📡 Firebase update: ${data.tasks.length} tasks, ${data.history.length} clicks`)
          callback(data)
        } catch (error) {
          log.error('Error processing Firebase update:', error)
        }
      }, (error) => {
        log.error('Firebase listener error:', error)
      })

      // Store cleanup function
      this.unsubscribe = () => {
        off(tasksRef)
      }

      log.log('✅ Firebase listener started')
    } catch (error) {
      log.error('Failed to start Firebase listener:', error)
      throw error
    }
  }

  /**
   * Stop listening for real-time updates
   */
  stopListening(): void {
    if (this.unsubscribe) {
      log.log('🔇 Stopping Firebase listener')
      this.unsubscribe()
      this.unsubscribe = null
    }
  }

  /**
   * Clear current user and stop listening
   */
  clearUser(): void {
    log.log('🔓 Clearing user')
    this.stopListening()
    this.currentUserId = null
  }

  /**
   * Check if Firebase is currently listening
   */
  isListening(): boolean {
    return this.unsubscribe !== null
  }
}

// Export singleton instance
export const firebaseService = new FirebaseService()
