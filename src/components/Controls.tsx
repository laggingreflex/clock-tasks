interface ControlsProps {
  sortMode: 'total' | 'alphabetical'
  deletionMode: boolean
  readOnly?: boolean
  onStopAll: () => void
  onResetAll: () => void
  onToggleSort: () => void
  onToggleDeletion: () => void
  onDeleteAll: () => void
  onToggleReadOnly?: () => void
}

export function Controls({
  sortMode,
  deletionMode,
  readOnly = false,
  onStopAll,
  onResetAll,
  onToggleSort,
  onToggleDeletion,
  onDeleteAll,
  onToggleReadOnly
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
        <button title="Stop all tasks" onClick={onStopAll} disabled={readOnly}>
          ⏹
        </button>
        <button title="Reset all tasks" onClick={onResetAll} disabled={readOnly}>
          🔄
        </button>
        <button
          title={sortMode === 'total' ? 'Sort: Total Time (descending)' : 'Sort: Alphabetical'}
          onClick={onToggleSort}
          disabled={readOnly}
        >
          {sortMode === 'total' ? '⏱' : '🔤'}
        </button>
        <button
          title={deletionMode ? 'Delete all tasks' : 'Enable deletion mode'}
          className={`delete-btn ${deletionMode ? 'deletion-active' : ''}`}
          onClick={handleDeleteAllClick}
          disabled={readOnly}
        >
          🗑
        </button>
        <button
          title={readOnly ? 'Read-only mode (click to disable)' : 'Enable read-only mode'}
          onClick={onToggleReadOnly}
          className={`readonly-btn ${readOnly ? 'readonly-active' : ''}`}
        >
          {readOnly ? '🔒' : '🔓'}
        </button>
      </div>
    </div>
  )
}
