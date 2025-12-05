import type { User } from '../types'
import { formatTime } from '../utils/timeFormatter'

interface UserHeaderProps {
  user: User
  totalElapsedTime: number
  showUserMenu: boolean
  onToggleMenu: () => void
  onLogout: () => void
  onProfileClick?: () => void
}

export function UserHeader({
  user,
  totalElapsedTime,
  showUserMenu,
  onToggleMenu,
  onLogout,
  onProfileClick
}: UserHeaderProps) {
  const handleAvatarClick = () => {
    if (user.isGuest && onProfileClick) {
      onProfileClick()
    } else {
      onToggleMenu()
    }
  }

  return (
    <div className="header">
      <div>
        <h1>Tasks Clock: {formatTime(totalElapsedTime)}</h1>
      </div>
      <div className="user-info">
        <div className="user-avatar-container" onClick={handleAvatarClick} title={user.isGuest ? "Click to sign in" : user.name}>
          <img src={user.picture} alt={user.name} className="user-avatar" />
          {showUserMenu && !user.isGuest && (
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
