/**
 * Google OAuth Authentication Provider
 * Implements AuthProvider interface using Google OAuth 2.0
 */

import type { User } from '@/types'
// Removed custom logger; use console.* with explicit prefixes
import type { AuthProvider, TokenStore } from './types'

const LOG_PREFIX_FILE = '[clock-tasks][GoogleAuthProvider]'

/**
 * Simple in-memory token store
 * Can be replaced with persistent storage if needed
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

export class GoogleAuthProvider implements AuthProvider {
  private tokenStore: TokenStore

  constructor(tokenStore?: TokenStore) {
    this.tokenStore = tokenStore || new GoogleTokenStore()
  }

  async signIn(): Promise<User> {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:signIn`
    try {
      console.debug(LOG_PREFIX_FN, 'Starting Google OAuth sign-in flow...')

      // Load Google API client library if not already loaded
      if (!window.gapi) {
        await this.loadGapiScript()
      }

      return new Promise<User>((resolve, reject) => {
        // Initialize Google API client
        window.gapi.load('auth2', () => {
          const auth2 = window.gapi.auth2.init({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
            scope: 'profile email https://www.googleapis.com/auth/drive.file'
          })

          auth2.signIn().then((googleUser: any) => {
            const profile = googleUser.getBasicProfile()
            const authResponse = googleUser.getAuthResponse(true)

            // Store access token for use by storage provider
            this.tokenStore.setAccessToken(authResponse.id_token)

            const user: User = {
              id: profile.getId(),
              email: profile.getEmail(),
              name: profile.getName(),
              picture: profile.getImageUrl(),
              accessToken: authResponse.id_token,
              isGuest: false
            }

            console.log(LOG_PREFIX_FN, `✅ User signed in: ${user.name}`)
            resolve(user)
          }).catch((error: any) => {
            console.error(LOG_PREFIX_FN, 'Google sign-in failed:', error)
            reject(error)
          })
        })
      })
    } catch (error) {
      console.error(LOG_PREFIX_FN, 'Sign-in failed:', error)
      throw error
    }
  }

  async signOut(): Promise<void> {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:signOut`
    try {
      if (!window.gapi) {
        return
      }

      const auth2 = window.gapi.auth2.getAuthInstance()
      if (auth2) {
        await auth2.signOut()
        this.tokenStore.clearToken()
        console.log(LOG_PREFIX_FN, '✅ User signed out')
      }
    } catch (error) {
      console.error(LOG_PREFIX_FN, 'Sign-out failed:', error)
      throw error
    }
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    try {
      if (!window.gapi) {
        // If gapi isn't loaded yet, return a no-op unsubscribe
        return () => {}
      }

      window.gapi.load('auth2', () => {
        const auth2 = window.gapi.auth2.init({
          client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
          scope: 'profile email https://www.googleapis.com/auth/drive.file'
        })

        // Listen for auth state changes
        auth2.isSignedIn.listen((isSignedIn: boolean) => {
          if (isSignedIn) {
            const googleUser = auth2.currentUser.get()
            const profile = googleUser.getBasicProfile()
            const authResponse = googleUser.getAuthResponse(true)

            this.tokenStore.setAccessToken(authResponse.id_token)

            const user: User = {
              id: profile.getId(),
              email: profile.getEmail(),
              name: profile.getName(),
              picture: profile.getImageUrl(),
              accessToken: authResponse.id_token,
              isGuest: false
            }

            callback(user)
          } else {
            this.tokenStore.clearToken()
            callback(null)
          }
        })

        // Check initial state
        if (auth2.isSignedIn.get()) {
          const googleUser = auth2.currentUser.get()
          const profile = googleUser.getBasicProfile()
          const authResponse = googleUser.getAuthResponse(true)

          this.tokenStore.setAccessToken(authResponse.id_token)

          const user: User = {
            id: profile.getId(),
            email: profile.getEmail(),
            name: profile.getName(),
            picture: profile.getImageUrl(),
            accessToken: authResponse.id_token,
            isGuest: false
          }

          callback(user)
        }
      })
    } catch (error) {
      console.error(`${LOG_PREFIX_FILE}:onAuthStateChange`, 'Auth state listener setup failed:', error)
      callback(null)
    }

    // Return unsubscribe function
    return () => {
      // Note: gapi doesn't provide an easy way to unsubscribe from auth state changes
      // This would require storing the listener handle, which gapi doesn't expose
    }
  }

  getCurrentUser(): User | null {
    try {
      if (!window.gapi || !window.gapi.auth2) {
        return null
      }

      const auth2 = window.gapi.auth2.getAuthInstance()
      if (!auth2 || !auth2.isSignedIn.get()) {
        return null
      }

      const googleUser = auth2.currentUser.get()
      const profile = googleUser.getBasicProfile()
      const authResponse = googleUser.getAuthResponse(true)

      return {
        id: profile.getId(),
        email: profile.getEmail(),
        name: profile.getName(),
        picture: profile.getImageUrl(),
        accessToken: authResponse.id_token,
        isGuest: false
      }
    } catch (error) {
      console.error(`${LOG_PREFIX_FILE}:getCurrentUser`, 'Failed to get current user:', error)
      return null
    }
  }

  saveUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user))
    // Also save the access token separately
    if (user.accessToken) {
      this.tokenStore.setAccessToken(user.accessToken)
    }
  }

  loadUser(): User | null {
    const saved = localStorage.getItem('user')
    if (!saved) {
      return this.createGuestUser()
    }
    try {
      const user = JSON.parse(saved)
      // Restore access token if available
      if (user.accessToken) {
        this.tokenStore.setAccessToken(user.accessToken)
      }
      return user
    } catch {
      return this.createGuestUser()
    }
  }

  clearUser(): void {
    localStorage.removeItem('user')
    localStorage.removeItem('googleUser')
    localStorage.removeItem('firebaseUser')
    this.tokenStore.clearToken()
  }

  createGuestUser(): User {
    return {
      id: 'guest',
      email: 'guest@local',
      name: 'Guest',
      picture: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23999"/><circle cx="50" cy="35" r="20" fill="%23fff"/><ellipse cx="50" cy="80" rx="30" ry="20" fill="%23fff"/></svg>',
      accessToken: '',
      isGuest: true
    }
  }

  private loadGapiScript(): Promise<void> {
    return new Promise((resolve) => {
      if (window.gapi) {
        resolve()
        return
      }

      const script = document.createElement('script')
      script.src = 'https://apis.google.com/js/platform.js'
      script.async = true
      script.defer = true
      script.onload = () => resolve()
      document.head.appendChild(script)
    })
  }
}

// Type augmentation for window.gapi
declare global {
  interface Window {
    gapi: any
  }
}
