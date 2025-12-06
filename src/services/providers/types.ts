/**
 * Provider abstractions for pluggable authentication and storage backends
 * Allows switching between Firebase, Google Drive, etc. with minimal code changes
 */

import type { User } from '@/types'
import type { StoredData, StorageBackend } from '@/core'

/**
 * Authentication provider interface
 * Implementations: Firebase, Google OAuth, etc.
 */
export interface AuthProvider {
  /**
   * Sign in the user (provider-specific implementation)
   */
  signIn(): Promise<User>

  /**
   * Sign out the current user
   */
  signOut(): Promise<void>

  /**
   * Listen for authentication state changes
   * @returns Unsubscribe function
   */
  onAuthStateChange(callback: (user: User | null) => void): () => void

  /**
   * Get the current authenticated user
   */
  getCurrentUser(): User | null

  /**
   * Persist user to local storage
   */
  saveUser(user: User): void

  /**
   * Load user from local storage
   */
  loadUser(): User | null

  /**
   * Clear user from local storage
   */
  clearUser(): void

  /**
   * Create an anonymous guest user
   */
  createGuestUser(): User
}

/**
 * Storage provider interface
 * Wraps StorageBackend with real-time sync capabilities
 */
export interface StorageProvider extends StorageBackend {
  /**
   * Set the current user ID (for multi-user storage backends)
   */
  setUserId(userId: string): void

  /**
   * Start listening for real-time updates
   * @returns Nothing; use callback to receive updates
   */
  startListening(callback: (data: StoredData) => void): void

  /**
   * Stop listening for real-time updates
   */
  stopListening(): void

  /**
   * Check if currently listening for updates
   */
  isListening(): boolean

  /**
   * Clear user and stop listening
   */
  clearUser(): void
}

/**
 * Token store for providers that need to share OAuth tokens
 * (e.g., GoogleAuthProvider needs to share tokens with GoogleDriveStorageProvider)
 */
export interface TokenStore {
  /**
   * Set the current access token
   */
  setAccessToken(token: string): void

  /**
   * Get the current access token
   */
  getAccessToken(): string | null

  /**
   * Clear the token
   */
  clearToken(): void
}
