import { forwardRef } from 'react'
import { useGoogleLogin } from '@react-oauth/google'
import type { User } from '@/types'
import { createUserFromGoogleInfo, fetchUserInfo, GOOGLE_OAUTH_SCOPE } from '@/utils/authHelpers'

interface LoginComponentProps {
  onLoginSuccess: (user: User) => void
  hidden?: boolean
}

export const LoginComponent = forwardRef<HTMLButtonElement, LoginComponentProps>(
  function LoginComponent({ onLoginSuccess, hidden }, ref) {
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

    if (hidden) {
      return (
        <button
          ref={ref}
          onClick={() => login()}
          className="google-login-btn"
          style={{ display: 'none' }}
        >
          Sign in with Google
        </button>
      )
    }

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
)
