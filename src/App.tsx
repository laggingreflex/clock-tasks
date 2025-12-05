import { useState, useRef } from 'react'
import './App.css'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { formatTime, TaskQueries } from './core'
import { loadUserFromLocalStorage, createGuestUser } from './utils/authHelpers'
import { useClickOutside, useDocumentTitle, useScrollToNewTask, useCurrentTime, useTaskState, useUIState, useSyncEffect, useTaskHandlers, useSortedTasks } from './hooks'
import { LoginComponent } from './components/LoginComponent'
import { AddTaskForm } from './components/AddTaskForm'
import { TaskList } from './components/TaskList'
import { UserHeader } from './components/UserHeader'
import { Controls } from './components/Controls'
import type { User } from './types'

function App() {
  const [user, setUser] = useState<User | null>(loadUserFromLocalStorage)
  const [driveFileId, setDriveFileId] = useState<string | null>(null)
  const loginButtonRef = useRef<HTMLButtonElement>(null)

  const { state, setState } = useTaskState()
  const ui = useUIState()
  const { syncToGoogleDrive } = useSyncEffect(user, setState, setDriveFileId, () => {})
  const handlers = useTaskHandlers(state, setState, syncToGoogleDrive, driveFileId, ui.setDeletionMode, ui.setLastAddedTaskId)
  const sortedTasks = useSortedTasks(state, ui.now, ui.sortMode)

  useCurrentTime(ui.setNow)
  useDocumentTitle(`Tasks Clock: ${formatTime(TaskQueries.getTotalElapsedTime(state, ui.now))}`)
  useScrollToNewTask(ui.lastAddedTaskId, () => ui.setLastAddedTaskId(null))
  useClickOutside(ui.deletionMode, () => ui.setDeletionMode(false), '.delete-btn')
  useClickOutside(ui.showUserMenu, () => ui.setShowUserMenu(false), '.user-avatar-container')

  const handleLogout = () => {
    localStorage.removeItem('googleUser')
    // Reset to guest user
    setUser(createGuestUser())
  }

  const handleLoginSuccess = (newUser: User) => {
    setUser(newUser)
    localStorage.setItem('googleUser', JSON.stringify(newUser))
  }

  const handleProfileClick = () => {
    if (user?.isGuest && loginButtonRef.current) {
      loginButtonRef.current.click()
    }
  }

  return (
    <GoogleOAuthProvider clientId={import.meta.env.VITE_GOOGLE_CLIENT_ID}>
      <div>
        <LoginComponent
          onLoginSuccess={handleLoginSuccess}
          hidden={true}
          ref={loginButtonRef}
        />
        {user && (
          <>
            <UserHeader
              user={user}
              totalElapsedTime={TaskQueries.getTotalElapsedTime(state, ui.now)}
              showUserMenu={ui.showUserMenu}
              onToggleMenu={() => ui.setShowUserMenu(!ui.showUserMenu)}
              onLogout={handleLogout}
              onProfileClick={user.isGuest ? handleProfileClick : undefined}
            />
            <AddTaskForm onAdd={handlers.handleAddTask} />
            <TaskList
              tasks={sortedTasks}
              deletionMode={ui.deletionMode}
              totalTasksTime={TaskQueries.getTotalElapsedTime(state, ui.now)}
              onNameChange={handlers.handleUpdateTaskName}
              onFocus={handlers.handleStartTask}
              onDelete={handlers.handleDeleteTask}
            />
            <Controls
              sortMode={ui.sortMode}
              deletionMode={ui.deletionMode}
              onStopAll={() => ui.setNow(Date.now())}
              onResetAll={handlers.handleResetAll}
              onToggleSort={() => ui.setSortMode(prev => prev === 'total' ? 'alphabetical' : 'total')}
              onToggleDeletion={() => ui.setDeletionMode(!ui.deletionMode)}
              onDeleteAll={handlers.handleDeleteAllTasks}
            />
          </>
        )}
      </div>
    </GoogleOAuthProvider>
  )
}

export default App