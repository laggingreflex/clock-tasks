import { useState, useRef, useEffect, useMemo } from 'react'
import './App.css'
import { formatTime, TaskQueries } from './core'
import { saveSortModePreference } from './core/storage'
import { useAppOptions } from './hooks/OptionsContext'
import { getAuthProvider, logProviderConfiguration } from './services/providers'
import { useClickOutside, useDocumentTitle, useScrollToNewTask, useCurrentTime, useTaskState, useUIState, useSyncEffect, useTaskHandlers, useSortedTasks } from './hooks'
import { LoginComponent } from './components/LoginComponent'
import { AddTaskForm } from './components/AddTaskForm'
import { TaskList } from './components/TaskList'
import { UserHeader } from './components/UserHeader'
import { Controls } from './components/Controls'
import type { User } from './types'

function App() {
  const { readOnly } = useAppOptions()
  // Memoize auth provider to prevent resubscription and stabilize dependencies
  const authProvider = useMemo(() => getAuthProvider(), [])

  const [user, setUser] = useState<User | null>(() => authProvider.loadUser())
  const [driveFileId, setDriveFileId] = useState<string | null>(null)
  const loginButtonRef = useRef<HTMLButtonElement>(null)

  // Initialize provider configuration logging on mount
  useEffect(() => {
    logProviderConfiguration()
  }, [])

  // Listen for auth state changes
  useEffect(() => {
    const unsubscribe = authProvider.onAuthStateChange((authUser) => {
      if (authUser) {
        setUser(authUser)
        authProvider.saveUser(authUser)
      }
    })
    return unsubscribe
  }, [authProvider])

  const { state, setState } = useTaskState()
  const ui = useUIState()
  const { syncToGoogleDrive } = useSyncEffect(user, setState, setDriveFileId, () => {})
  const handlers = useTaskHandlers(state, setState, syncToGoogleDrive, driveFileId, ui.setDeletionMode, ui.setLastAddedTaskId)
  const sortedTasks = useSortedTasks(state, ui.now, ui.sortMode)

  // Save sort mode preference whenever it changes
  useEffect(() => {
    if (!readOnly) {
      saveSortModePreference(ui.sortMode)
    }
  }, [ui.sortMode, readOnly])

  useCurrentTime(ui.setNow)
  useDocumentTitle(`Tasks Clock: ${formatTime(TaskQueries.getTotalElapsedTime(state, ui.now))}`)
  useScrollToNewTask(ui.lastAddedTaskId, () => ui.setLastAddedTaskId(null))
  useClickOutside(ui.deletionMode, () => ui.setDeletionMode(false), '.delete-btn')
  useClickOutside(ui.showUserMenu, () => ui.setShowUserMenu(false), '.user-avatar-container')

  const handleLogout = async () => {
    try {
      await authProvider.signOut()
      authProvider.clearUser()
      // Reset to guest user
      setUser(authProvider.createGuestUser())
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleLoginSuccess = (newUser: User) => {
    setUser(newUser)
    authProvider.saveUser(newUser)
  }

  const handleProfileClick = () => {
    if (user?.isGuest && loginButtonRef.current) {
      loginButtonRef.current.click()
    }
  }

  return (
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
            readOnly={readOnly}
            onStopAll={handlers.handleStopAll}
            onResetAll={handlers.handleResetAll}
            onToggleSort={() => readOnly ? null : ui.setSortMode(prev => prev === 'total' ? 'alphabetical' : 'total')}
            onToggleDeletion={() => readOnly ? null : ui.setDeletionMode(!ui.deletionMode)}
            onDeleteAll={handlers.handleDeleteAllTasks}
            onToggleReadOnly={() => {
              const url = new URL(window.location.href)
              if (readOnly) {
                url.searchParams.delete('readonly')
              } else {
                // presence is enough, set to empty
                url.searchParams.set('readonly', '')
              }
              window.location.href = url.toString()
            }}
          />
        </>
      )}
    </div>
  )
}

export default App