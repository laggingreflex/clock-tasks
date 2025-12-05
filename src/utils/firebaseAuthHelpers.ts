// Firebase Authentication helpers
import { GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User as FirebaseUser } from 'firebase/auth'
import { auth } from '@/services/firebaseConfig'
import type { User } from '@/types'
import { createLogger } from '@/utils/logger'

const log = createLogger('FirebaseAuth')

/**
 * Sign in with Google using Firebase Authentication
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const provider = new GoogleAuthProvider()
    // Request Drive scope for future compatibility (though we're using Firebase now)
    provider.addScope('https://www.googleapis.com/auth/drive.file')

    log.debug('Starting Google sign-in flow...')
    const result = await signInWithPopup(auth, provider)

    const firebaseUser = result.user
    const user = convertFirebaseUserToUser(firebaseUser)

    log.log(`✅ User signed in: ${user.name}`)
    return user
  } catch (error) {
    log.error('Sign-in failed:', error)
    throw error
  }
}

/**
 * Sign out current user
 */
export async function signOutUser(): Promise<void> {
  try {
    await signOut(auth)
    log.log('✅ User signed out')
  } catch (error) {
    log.error('Sign-out failed:', error)
    throw error
  }
}

/**
 * Convert Firebase User to our User type
 */
export function convertFirebaseUserToUser(firebaseUser: FirebaseUser): User {
  return {
    id: firebaseUser.uid,
    email: firebaseUser.email || '',
    name: firebaseUser.displayName || 'User',
    picture: firebaseUser.photoURL || '',
    accessToken: '', // No longer needed for Firebase operations
    isGuest: false
  }
}

/**
 * Listen for auth state changes
 */
export function onAuthStateChange(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, (firebaseUser) => {
    if (firebaseUser) {
      const user = convertFirebaseUserToUser(firebaseUser)
      callback(user)
    } else {
      callback(null)
    }
  })
}

/**
 * Create an anonymous guest user
 */
export function createGuestUser(): User {
  return {
    id: 'guest',
    email: 'guest@local',
    name: 'Guest',
    picture: 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><circle cx="50" cy="50" r="50" fill="%23999"/><circle cx="50" cy="35" r="20" fill="%23fff"/><ellipse cx="50" cy="80" rx="30" ry="20" fill="%23fff"/></svg>',
    accessToken: '',
    isGuest: true
  }
}

/**
 * Persist user to localStorage
 */
export function saveUserToLocalStorage(user: User): void {
  localStorage.setItem('firebaseUser', JSON.stringify(user))
}

/**
 * Retrieve user from localStorage
 */
export function loadUserFromLocalStorage(): User | null {
  const saved = localStorage.getItem('firebaseUser')
  if (!saved) {
    return createGuestUser()
  }
  try {
    return JSON.parse(saved)
  } catch {
    return createGuestUser()
  }
}

/**
 * Clear user from localStorage
 */
export function clearUserFromLocalStorage(): void {
  localStorage.removeItem('firebaseUser')
  // Also remove old Google user if it exists
  localStorage.removeItem('googleUser')
}
