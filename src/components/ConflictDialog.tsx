import React from 'react'
import '../styles/ConflictDialog.css'

interface ConflictDialogProps {
  isOpen: boolean
  serverTime: string
  localTime: string
  onOverwrite: () => void
  onDiscard: () => void
}

export const ConflictDialog: React.FC<ConflictDialogProps> = ({
  isOpen,
  serverTime,
  localTime,
  onOverwrite,
  onDiscard
}) => {
  if (!isOpen) return null

  return (
    <div className="conflict-dialog-overlay">
      <div className="conflict-dialog">
        <h2>⚠️ Sync Conflict Detected</h2>
        <p>Server data is more recent than your local changes.</p>

        <div className="conflict-info">
          <div className="info-row">
            <span className="label">Server last modified:</span>
            <span className="time">{serverTime}</span>
          </div>
          <div className="info-row">
            <span className="label">Your local changes:</span>
            <span className="time">{localTime}</span>
          </div>
        </div>

        <p className="help-text">Choose what to do:</p>

        <div className="conflict-buttons">
          <button
            className="btn btn-primary"
            onClick={onOverwrite}
          >
            Overwrite Server
          </button>
          <button
            className="btn btn-secondary"
            onClick={onDiscard}
          >
            Keep Server Data
          </button>
        </div>
      </div>
    </div>
  )
}
