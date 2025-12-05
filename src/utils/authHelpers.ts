import type { User } from '../types'

export const GOOGLE_OAUTH_SCOPE = 'openid email profile https://www.googleapis.com/auth/drive.file'

/**
 * Fetch user info from Google OAuth token
 */
export async function fetchUserInfo(accessToken: string): Promise<any> {
  const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  })
  return userInfoResponse.json()
}

/**
 * Convert Google OAuth user info to our User type
 */
export function createUserFromGoogleInfo(userInfo: any, accessToken: string): User {
  return {
    id: userInfo.id,
    email: userInfo.email,
    name: userInfo.name,
    picture: userInfo.picture,
    accessToken
  }
}

/**
 * Persist user to localStorage
 */
export function saveUserToLocalStorage(user: User): void {
  localStorage.setItem('googleUser', JSON.stringify(user))
}

/**
 * Retrieve user from localStorage
 */
export function loadUserFromLocalStorage(): User | null {
  const saved = localStorage.getItem('googleUser')
  if (!saved) {
    // Return guest user if no saved user
    return createGuestUser()
  }
  try {
    return JSON.parse(saved)
  } catch {
    return createGuestUser()
  }
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
 * Clear user from localStorage
 */
export function clearUserFromLocalStorage(): void {
  localStorage.removeItem('googleUser')
}
