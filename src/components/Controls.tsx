interface ControlsProps {
  sortMode: 'total' | 'alphabetical'
  deletionMode: boolean
  onStopAll: () => void
  onResetAll: () => void
  onToggleSort: () => void
  onToggleDeletion: () => void
  onDeleteAll: () => void
}

export function Controls({
  sortMode,
  deletionMode,
  onStopAll,
  onResetAll,
  onToggleSort,
  onToggleDeletion,
  onDeleteAll
}: ControlsProps) {
  const handleDeleteAllClick = () => {
    if (deletionMode) {
      onDeleteAll()
    } else {
      onToggleDeletion()
    }
  }

  return (
    <div className="controls">
      <div className="controls-buttons">
        <button title="Stop all tasks" onClick={onStopAll}>
          ⏹
        </button>
        <button title="Reset all tasks" onClick={onResetAll}>
          🔄
        </button>
        <button
          title={sortMode === 'total' ? 'Sort: Total Time (descending)' : 'Sort: Alphabetical'}
          onClick={onToggleSort}
        >
          {sortMode === 'total' ? '⏱' : '🔤'}
        </button>
        <button
          title={deletionMode ? 'Delete all tasks' : 'Enable deletion mode'}
          className={`delete-btn ${deletionMode ? 'deletion-active' : ''}`}
          onClick={handleDeleteAllClick}
        >
          🗑
        </button>
      </div>
    </div>
  )
}
