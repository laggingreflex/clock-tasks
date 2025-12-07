/**
 * Firebase Authentication Provider
 * Implements AuthProvider interface using Firebase Auth
 */

import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { auth } from '@/services/firebaseConfig'
import type { User } from '@/types'
// Removed custom logger; use console.* with explicit prefixes
import type { AuthProvider } from './types'

const LOG_PREFIX_FILE = '[clock-tasks][FirebaseAuthProvider]'

export class FirebaseAuthProvider implements AuthProvider {
  async signIn(): Promise<User> {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:signIn`
    try {
      const provider = new GoogleAuthProvider()
      // Request Drive scope for future compatibility (though we're using Firebase now)
      provider.addScope('https://www.googleapis.com/auth/drive.file')

      console.debug(LOG_PREFIX_FN, 'Starting Google sign-in flow...')
      const result = await signInWithPopup(auth, provider)

      const firebaseUser = result.user
      const user = this.convertFirebaseUserToUser(firebaseUser)

      console.log(LOG_PREFIX_FN, `✅ User signed in: ${user.name}`)
      return user
    } catch (error) {
      console.error(LOG_PREFIX_FN, 'Sign-in failed:', error)
      throw error
    }
  }

  async signOut(): Promise<void> {
    const LOG_PREFIX_FN = `${LOG_PREFIX_FILE}:signOut`
    try {
      await signOut(auth)
      console.log(LOG_PREFIX_FN, '✅ User signed out')
    } catch (error) {
      console.error(LOG_PREFIX_FN, 'Sign-out failed:', error)
      throw error
    }
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    let lastUserId: string | null = null
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const user = this.convertFirebaseUserToUser(firebaseUser)
        // Dedupe identical auth callbacks for the same user id
        if (lastUserId !== user.id) {
          lastUserId = user.id
          callback(user)
        }
      } else {
        if (lastUserId !== null) {
          lastUserId = null
          callback(null)
        }
      }
    })
  }

  getCurrentUser(): User | null {
    const firebaseUser = auth.currentUser
    if (firebaseUser) {
      return this.convertFirebaseUserToUser(firebaseUser)
    }
    return null
  }

  saveUser(user: User): void {
    localStorage.setItem('user', JSON.stringify(user))
  }

  loadUser(): User | null {
    const saved = localStorage.getItem('user')
    if (!saved) {
      return this.createGuestUser()
    }
    try {
      return JSON.parse(saved)
    } catch {
      return this.createGuestUser()
    }
  }

  clearUser(): void {
    localStorage.removeItem('user')
    localStorage.removeItem('firebaseUser')
    localStorage.removeItem('googleUser')
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

  private convertFirebaseUserToUser(firebaseUser: FirebaseUser): User {
    return {
      id: firebaseUser.uid,
      email: firebaseUser.email || '',
      name: firebaseUser.displayName || 'User',
      picture: firebaseUser.photoURL || '',
      accessToken: '', // No longer needed for Firebase operations
      isGuest: false
    }
  }
}
