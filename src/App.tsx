import { useState, useRef, useEffect } from 'react'
import './App.css'
import { formatTime, TaskQueries } from './core'
import { saveSortModePreference } from './core/storage'
import { loadUserFromLocalStorage, saveUserToLocalStorage, clearUserFromLocalStorage, onAuthStateChange, createGuestUser } from './utils/firebaseAuthHelpers'
import { signOutUser } from './utils/firebaseAuthHelpers'
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

  // Listen for Firebase auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChange((firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        saveUserToLocalStorage(firebaseUser)
      }
    })
    return unsubscribe
  }, [])

  const { state, setState } = useTaskState()
  const ui = useUIState()
  const { syncToGoogleDrive } = useSyncEffect(user, setState, setDriveFileId, () => {})
  const handlers = useTaskHandlers(state, setState, syncToGoogleDrive, driveFileId, ui.setDeletionMode, ui.setLastAddedTaskId)
  const sortedTasks = useSortedTasks(state, ui.now, ui.sortMode)

  // Save sort mode preference whenever it changes
  useEffect(() => {
    saveSortModePreference(ui.sortMode)
  }, [ui.sortMode])

  useCurrentTime(ui.setNow)
  useDocumentTitle(`Tasks Clock: ${formatTime(TaskQueries.getTotalElapsedTime(state, ui.now))}`)
  useScrollToNewTask(ui.lastAddedTaskId, () => ui.setLastAddedTaskId(null))
  useClickOutside(ui.deletionMode, () => ui.setDeletionMode(false), '.delete-btn')
  useClickOutside(ui.showUserMenu, () => ui.setShowUserMenu(false), '.user-avatar-container')

  const handleLogout = async () => {
    try {
      await signOutUser()
      clearUserFromLocalStorage()
      // Reset to guest user
      setUser(createGuestUser())
    } catch (error) {
      console.error('Logout failed:', error)
    }
  }

  const handleLoginSuccess = (newUser: User) => {
    setUser(newUser)
    saveUserToLocalStorage(newUser)
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
            onStopAll={handlers.handleStopAll}
            onResetAll={handlers.handleResetAll}
            onToggleSort={() => ui.setSortMode(prev => prev === 'total' ? 'alphabetical' : 'total')}
            onToggleDeletion={() => ui.setDeletionMode(!ui.deletionMode)}
            onDeleteAll={handlers.handleDeleteAllTasks}
          />
        </>
      )}
    </div>
  )
}

export default App