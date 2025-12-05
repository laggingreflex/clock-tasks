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
  if (!saved) return null
  try {
    return JSON.parse(saved)
  } catch {
    return null
  }
}

/**
 * Clear user from localStorage
 */
export function clearUserFromLocalStorage(): void {
  localStorage.removeItem('googleUser')
}
