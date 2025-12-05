import type { User } from '../types'
import { formatTime } from '../utils/timeFormatter'

interface UserHeaderProps {
  user: User
  totalElapsedTime: number
  showUserMenu: boolean
  onToggleMenu: () => void
  onLogout: () => void
}

export function UserHeader({
  user,
  totalElapsedTime,
  showUserMenu,
  onToggleMenu,
  onLogout
}: UserHeaderProps) {
  return (
    <div className="header">
      <div>
        <h1>Tasks Clock: {formatTime(totalElapsedTime)}</h1>
      </div>
      <div className="user-info">
        <div className="user-avatar-container" onClick={onToggleMenu}>
          <img src={user.picture} alt={user.name} className="user-avatar" />
          {showUserMenu && (
            <button
              className="logout-btn"
              onClick={(e) => {
                e.stopPropagation()
                onLogout()
              }}
            >
              🚪 Logout
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
