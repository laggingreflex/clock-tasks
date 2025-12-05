import { useState } from 'react'

export const useUIState = () => {
  const [deletionMode, setDeletionMode] = useState(false)
  const [lastAddedTaskId, setLastAddedTaskId] = useState<string | null>(null)
  const [sortMode, setSortMode] = useState<'total' | 'alphabetical'>('total')
  const [now, setNow] = useState(Date.now())
  const [showUserMenu, setShowUserMenu] = useState(false)

  return {
    deletionMode,
    setDeletionMode,
    lastAddedTaskId,
    setLastAddedTaskId,
    sortMode,
    setSortMode,
    now,
    setNow,
    showUserMenu,
    setShowUserMenu
  }
}
