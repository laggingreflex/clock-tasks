/**
 * Firebase Authentication Provider
 * Implements AuthProvider interface using Firebase Auth
 */

import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { auth } from '@/services/firebaseConfig'
import type { User } from '@/types'
import { createLogger } from '@/utils/logger'
import type { AuthProvider } from './types'

const log = createLogger('FirebaseAuthProvider')

export class FirebaseAuthProvider implements AuthProvider {
  async signIn(): Promise<User> {
    try {
      const provider = new GoogleAuthProvider()
      // Request Drive scope for future compatibility (though we're using Firebase now)
      provider.addScope('https://www.googleapis.com/auth/drive.file')

      log.debug('Starting Google sign-in flow...')
      const result = await signInWithPopup(auth, provider)

      const firebaseUser = result.user
      const user = this.convertFirebaseUserToUser(firebaseUser)

      log.log(`✅ User signed in: ${user.name}`)
      return user
    } catch (error) {
      log.error('Sign-in failed:', error)
      throw error
    }
  }

  async signOut(): Promise<void> {
    try {
      await signOut(auth)
      log.log('✅ User signed out')
    } catch (error) {
      log.error('Sign-out failed:', error)
      throw error
    }
  }

  onAuthStateChange(callback: (user: User | null) => void): () => void {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const user = this.convertFirebaseUserToUser(firebaseUser)
        callback(user)
      } else {
        callback(null)
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
