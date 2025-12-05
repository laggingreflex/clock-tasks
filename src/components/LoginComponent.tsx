import { useGoogleLogin } from '@react-oauth/google'
import type { User } from '../types'
import { createUserFromGoogleInfo, fetchUserInfo, GOOGLE_OAUTH_SCOPE } from '../utils/authHelpers'

interface LoginComponentProps {
  onLoginSuccess: (user: User) => void
}

export function LoginComponent({ onLoginSuccess }: LoginComponentProps) {
  const login = useGoogleLogin({
    onSuccess: async (tokenResponse: any) => {
      try {
        const userInfo = await fetchUserInfo(tokenResponse.access_token)
        const newUser = createUserFromGoogleInfo(userInfo, tokenResponse.access_token)
        onLoginSuccess(newUser)
      } catch (error) {
        console.error('Login failed:', error)
      }
    },
    scope: GOOGLE_OAUTH_SCOPE
  })

  return (
    <div className="login-container">
      <h1>Tasks Clock</h1>
      <p>Sign in with Google to sync your tasks</p>
      <button onClick={() => login()} style={{ padding: '10px 20px', fontSize: '16px' }}>
        Sign in with Google
      </button>
    </div>
  )
}
