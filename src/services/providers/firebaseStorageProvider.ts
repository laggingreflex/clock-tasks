/**
 * Firebase Storage Provider
 * Implements StorageProvider interface using Firebase Realtime Database
 */

import { ref, set, onValue, off, get } from 'firebase/database'
import { database } from '@/services/firebaseConfig'
// Removed custom logger; use console.* with explicit prefixes
import type { StoredData } from '@/core'
import { serializeData, deserializeData, validateData } from '@/core/storageCore'
import type { StorageProvider } from './types'

const LOG_PREFIX_FILE = '[clock-tasks][FirebaseStorageProvider]'

type DataCallback = (data: StoredData) => void

export class FirebaseStorageProvider implements StorageProvider {
  private currentUserId: string | null = null
  private unsubscribe: (() => void) | null = null
  private lastEmittedTimestamp: number | null = null

  setUserId(userId: string): void {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:setUserId`
    if (this.currentUserId !== userId) {
      console.log(LOG_PREFIX_FN, `🔐 Setting user ID: ${userId}`)

      // Clean up old listener if user changed
      if (this.currentUserId) {
        this.stopListening()
      }

      this.currentUserId = userId
    }
  }

  private getUserTasksPath(): string {
    if (!this.currentUserId) {
      throw new Error('No user ID set. Call setUserId() first.')
    }
    return `users/${this.currentUserId}/tasks`
  }

  async save(data: StoredData): Promise<void> {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:save`
    try {
      if (!this.currentUserId) {
        console.warn(LOG_PREFIX_FN, 'Cannot save to Firebase: no user ID set')
        return
      }

      const path = this.getUserTasksPath()
      const tasksRef = ref(database, path)

      // Serialize data before saving
      const serialized = serializeData(data)

      console.debug(LOG_PREFIX_FN, `Saving to Firebase: ${data.tasks.length} tasks, ${data.history.length} clicks`)
      await set(tasksRef, serialized)
      console.log(LOG_PREFIX_FN, '☁️ Saved to Firebase')
    } catch (error) {
      console.error(LOG_PREFIX_FN, 'Failed to save to Firebase:', error)
      throw error
    }
  }

  async load(): Promise<StoredData> {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:load`
    try {
      if (!this.currentUserId) {
        throw new Error('No user ID set. Call setUserId() first.')
      }

      const path = this.getUserTasksPath()
      const tasksRef = ref(database, path)

      console.debug(LOG_PREFIX_FN, 'Loading tasks from Firebase...')
      const snapshot = await get(tasksRef)

      if (!snapshot.exists()) {
        console.log(LOG_PREFIX_FN, '☁️ No data in Firebase, initializing empty')
        const emptyData: StoredData = {
          tasks: [],
          history: [],
          lastModified: Date.now()
        }
        await this.save(emptyData)
        return emptyData
      }

      const serialized = snapshot.val()
      const data = deserializeData(serialized)

      if (!validateData(data)) {
        console.error(LOG_PREFIX_FN, 'Invalid data from Firebase:', data)
        throw new Error('Invalid data structure from Firebase')
      }

      console.log(LOG_PREFIX_FN, `☁️ Loaded from Firebase: ${data.tasks.length} tasks, ${data.history.length} clicks`)
      return data
    } catch (error) {
      console.error(LOG_PREFIX_FN, 'Failed to load from Firebase:', error)
      throw error
    }
  }

  async clear(): Promise<void> {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:clear`
    try {
      if (!this.currentUserId) {
        console.warn(LOG_PREFIX_FN, 'Cannot clear Firebase: no user ID set')
        return
      }

      const path = this.getUserTasksPath()
      const tasksRef = ref(database, path)
      await set(tasksRef, null)
      console.log(LOG_PREFIX_FN, '☁️ Cleared Firebase data')
    } catch (error) {
      console.error(LOG_PREFIX_FN, 'Failed to clear Firebase:', error)
      throw error
    }
  }

  startListening(callback: DataCallback): void {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:startListening`
    try {
      if (!this.currentUserId) {
        console.warn(LOG_PREFIX_FN, 'Cannot start listening: no user ID set')
        return
      }
      // If already listening, do not reattach
      if (this.unsubscribe) {
        return
      }

      const path = this.getUserTasksPath()
      const tasksRef = ref(database, path)

      console.log(LOG_PREFIX_FN, '📡 Starting Firebase real-time listener')

      // Set up the real-time listener
      onValue(
        tasksRef,
        (snapshot) => {
          if (!snapshot.exists()) {
            console.debug(LOG_PREFIX_FN, 'Firebase snapshot is empty')
            return
          }

          try {
            const serialized = snapshot.val()
            const data = deserializeData(serialized)

            if (!validateData(data)) {
              console.error(LOG_PREFIX_FN, 'Invalid data from Firebase listener:', data)
              return
            }

            // Dedupe identical payloads by lastModified timestamp
            if (this.lastEmittedTimestamp !== data.lastModified) {
              this.lastEmittedTimestamp = data.lastModified
              console.log(LOG_PREFIX_FN, `📡 Firebase update: ${data.tasks.length} tasks, ${data.history.length} clicks`)
              callback(data)
            } else {
              console.debug(LOG_PREFIX_FN, '📡 Firebase update deduped (no change)')
            }
          } catch (error) {
            console.error(LOG_PREFIX_FN, 'Error processing Firebase update:', error)
          }
        },
        (error) => {
          console.error(LOG_PREFIX_FN, 'Firebase listener error:', error)
        }
      )

      // Store cleanup function
      this.unsubscribe = () => {
        off(tasksRef)
      }

      console.log(LOG_PREFIX_FN, '✅ Firebase listener started')
    } catch (error) {
      console.error(LOG_PREFIX_FN, 'Failed to start Firebase listener:', error)
      throw error
    }
  }

  stopListening(): void {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:stopListening`
    if (!this.unsubscribe) {
      return
    }
    console.log(LOG_PREFIX_FN, '🔇 Stopping Firebase listener')
    this.unsubscribe()
    this.unsubscribe = null
    this.lastEmittedTimestamp = null
  }

  clearUser(): void {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:clearUser`
    console.log(LOG_PREFIX_FN, '🔓 Clearing user')
    this.stopListening()
    this.currentUserId = null
    this.lastEmittedTimestamp = null
  }

  isListening(): boolean {
    return this.unsubscribe !== null
  }
}
