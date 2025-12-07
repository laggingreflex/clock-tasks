/**
 * Provider Configuration Factory
 * Selects and instantiates auth and storage providers based on environment/config
 * Default: Firebase
 * Alternative: Google (auth + Google Drive storage)
 */

import { createLogger } from '@/utils/logger'
import type { AuthProvider, StorageProvider, TokenStore } from './types'
import { FirebaseAuthProvider } from './firebaseAuthProvider'
import { FirebaseStorageProvider } from './firebaseStorageProvider'
import { GoogleAuthProvider } from './googleAuthProvider'
import { GoogleDriveStorageProvider } from './googleDriveStorageProvider'

const log = createLogger('ProviderConfig')

/**
 * Provider name type - determines which auth/storage backend to use
 */
export type ProviderName = 'firebase' | 'google'

/**
 * Get the current provider setting from environment or localStorage
 * Falls back to 'firebase' as default
 */
export function getCurrentProviderName(): ProviderName {
  // Check environment variable first
  const envProvider = import.meta.env.VITE_AUTH_PROVIDER as ProviderName | undefined

  if (envProvider && ['firebase', 'google'].includes(envProvider)) {
    return envProvider
  }

  // Check localStorage
  const savedProvider = localStorage.getItem('authProvider') as ProviderName | null

  if (savedProvider && ['firebase', 'google'].includes(savedProvider)) {
    return savedProvider
  }

  // Default to Firebase
  return 'firebase'
}

/**
 * Set the provider (persists to localStorage)
 */
export function setCurrentProvider(provider: ProviderName): void {
  if (!['firebase', 'google'].includes(provider)) {
    throw new Error(`Invalid provider: ${provider}. Must be 'firebase' or 'google'`)
  }
  localStorage.setItem('authProvider', provider)
  log.log(`🔧 Provider switched to: ${provider}`)
}

/**
 * Create shared token store for Google providers
 * Used to share OAuth tokens between GoogleAuthProvider and GoogleDriveStorageProvider
 */
class GoogleTokenStore implements TokenStore {
  private static instance: GoogleTokenStore
  private token: string | null = null

  static getInstance(): GoogleTokenStore {
    if (!GoogleTokenStore.instance) {
      GoogleTokenStore.instance = new GoogleTokenStore()
    }
    return GoogleTokenStore.instance
  }

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

/**
 * Get the auth provider instance
 * Returns singleton instances - safe to call multiple times
 */
export function getAuthProvider(): AuthProvider {
  // Cache instances per provider to ensure singleton semantics
  // This avoids recreating providers on every render and stabilizes effect dependencies.
  const provider = getCurrentProviderName()

  // Module-scoped caches
  ;(getAuthProvider as any)._instances ||= {}
  const cache: Record<string, AuthProvider> = (getAuthProvider as any)._instances

  if (cache[provider]) {
    return cache[provider]
  }

  log.debug(`Creating AuthProvider: ${provider}`)

  switch (provider) {
    case 'firebase':
      cache[provider] = new FirebaseAuthProvider()
      return cache[provider]

    case 'google':
      // Share token store between auth and storage providers
      const tokenStore = GoogleTokenStore.getInstance()
      cache[provider] = new GoogleAuthProvider(tokenStore)
      return cache[provider]

    default:
      const exhaustiveCheck: never = provider
      throw new Error(`Unhandled provider: ${exhaustiveCheck}`)
  }
}

/**
 * Get the storage provider instance
 * Returns singleton instances - safe to call multiple times
 */
export function getStorageProvider(): StorageProvider {
  // Cache instances per provider to ensure singleton semantics
  const provider = getCurrentProviderName()

  ;(getStorageProvider as any)._instances ||= {}
  const cache: Record<string, StorageProvider> = (getStorageProvider as any)._instances

  if (cache[provider]) {
    return cache[provider]
  }

  log.debug(`Creating StorageProvider: ${provider}`)

  switch (provider) {
    case 'firebase':
      cache[provider] = new FirebaseStorageProvider()
      return cache[provider]

    case 'google':
      // Share token store between auth and storage providers
      const tokenStore = GoogleTokenStore.getInstance()
      cache[provider] = new GoogleDriveStorageProvider(tokenStore)
      return cache[provider]

    default:
      const exhaustiveCheck: never = provider
      throw new Error(`Unhandled provider: ${exhaustiveCheck}`)
  }
}

/**
 * Log current provider configuration
 */
export function logProviderConfiguration(): void {
  const provider = getCurrentProviderName()
  log.log(`📋 Using ${provider === 'firebase' ? '🔥 Firebase' : '🔵 Google'} provider`)
}
