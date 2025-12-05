import { forwardRef } from 'react'
import type { User } from '@/types'
import { signInWithGoogle } from '@/utils/firebaseAuthHelpers'

interface LoginComponentProps {
  onLoginSuccess: (user: User) => void
  hidden?: boolean
}

export const LoginComponent = forwardRef<HTMLButtonElement, LoginComponentProps>(
  function LoginComponent({ onLoginSuccess, hidden }, ref) {
    const handleLogin = async () => {
      try {
        const user = await signInWithGoogle()
        onLoginSuccess(user)
      } catch (error) {
        console.error('Login failed:', error)
      }
    }

    if (hidden) {
      return (
        <button
          ref={ref}
          onClick={handleLogin}
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
        <button onClick={handleLogin} style={{ padding: '10px 20px', fontSize: '16px' }}>
          Sign in with Google
        </button>
      </div>
    )
  }
)
