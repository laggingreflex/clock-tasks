import { useRef, type ChangeEvent } from 'react'

interface ControlsProps {
  sortMode: 'total' | 'alphabetical'
  deletionMode: boolean
  readOnly?: boolean
  onStopAll: () => void
  onResetAll: () => void
  onToggleSort: () => void
  onToggleDeletion: () => void
  onDeleteAll: () => void
  onExportData: () => Promise<unknown> | void
  onImportData: (file: File) => Promise<unknown> | void
  onToggleReadOnly?: () => void
}

type FilePickerOptions = {
  multiple?: boolean
  excludeAcceptAllOption?: boolean
  suggestedName?: string
  types?: Array<{
    description?: string
    accept: Record<string, string[]>
  }>
}

type FilePickerHandle = {
  getFile: () => Promise<File>
}

type PickerEnabledWindow = Window &
  typeof globalThis & {
    showOpenFilePicker?: (options?: FilePickerOptions) => Promise<FilePickerHandle[]>
  }

const LOG_PREFIX_FILE = '[clock-tasks][Controls]'

export function Controls(props: ControlsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null)
  // Common action state shape for logging and timing
  type ActionStateBase = {
    startedAt: Date
    error?: unknown
    runTime?: number
  }

  const _: { props: ControlsProps } & ActionStateBase = { props, startedAt: new Date() }
  try {
    const {
      sortMode,
      deletionMode,
      readOnly = false,
      onStopAll,
      onResetAll,
      onToggleSort,
      onToggleDeletion,
      onDeleteAll,
      onExportData,
      onImportData,
      onToggleReadOnly
    } = props

    const handleDeleteAllClick = () => {
      const actionState: { deletionMode: boolean } & ActionStateBase = { deletionMode, startedAt: new Date() }
      try {
        if (deletionMode) {
          onDeleteAll()
        } else {
          onToggleDeletion()
        }
      } catch (error) {
        actionState.error = error
        throw error
      } finally {
        actionState.runTime = Number(new Date()) - Number(actionState.startedAt)
        if (actionState.error) {
          console.error('[Controls:handleDeleteAllClick:error]', actionState)
        } else {
          console.debug('[Controls:handleDeleteAllClick:success]', actionState)
        }
      }
    }

    const handleExportClick = async () => {
      const actionState: ActionStateBase = { startedAt: new Date() }
      try {
        await onExportData()
      } catch (error) {
        actionState.error = error
        throw error
      } finally {
        actionState.runTime = Number(new Date()) - Number(actionState.startedAt)
        if (actionState.error) {
          console.error('[Controls:handleExportClick:error]', actionState)
        } else {
          console.debug('[Controls:handleExportClick:success]', actionState)
        }
      }
    }

    const handleImportButtonClick = async () => {
      const actionState: { readOnly: boolean } & ActionStateBase = { readOnly, startedAt: new Date() }
      try {
        if (readOnly) {
          console.debug('[Controls:handleImportButtonClick:status]', `${LOG_PREFIX_FILE} Import blocked: read-only`, actionState)
          return
        }
        const pickerWindow = window as PickerEnabledWindow
        if (pickerWindow.showOpenFilePicker) {
          const handles = await pickerWindow.showOpenFilePicker({
            multiple: false,
            suggestedName: 'clock-tasks.json',
            excludeAcceptAllOption: true,
            types: [
              {
                description: 'Clock Tasks backup',
                accept: {
                  'application/json': ['.json']
                }
              }
            ]
          })
          const fileHandle = handles?.[0]
          if (fileHandle) {
            const selectedFile = await fileHandle.getFile()
            await onImportData(selectedFile)
            return
          }
        }
        if (fileInputRef.current) {
          fileInputRef.current.value = ''
          fileInputRef.current.click()
        }
      } catch (error) {
        actionState.error = error
        throw error
      } finally {
        actionState.runTime = Number(new Date()) - Number(actionState.startedAt)
        if (actionState.error) {
          console.error('[Controls:handleImportButtonClick:error]', actionState)
        } else {
          console.debug('[Controls:handleImportButtonClick:success]', actionState)
        }
      }
    }

    const handleFileInputChange = async (event: ChangeEvent<HTMLInputElement>) => {
      const actionState: ActionStateBase = { startedAt: new Date() }
      const input = event.target
      try {
        const selectedFile = input.files?.[0]
        if (!selectedFile) {
          return
        }
        await onImportData(selectedFile)
      } catch (error) {
        actionState.error = error
        throw error
      } finally {
        input.value = ''
        actionState.runTime = Number(new Date()) - Number(actionState.startedAt)
        if (actionState.error) {
          console.error('[Controls:handleFileInputChange:error]', actionState)
        } else {
          console.debug('[Controls:handleFileInputChange:success]', actionState)
        }
      }
    }

    return (
      <div className="controls">
        <div className="controls-buttons">
          <button title="Stop all tasks" onClick={onStopAll} disabled={readOnly}>
            🛑
          </button>
          <button title="Reset all tasks" onClick={onResetAll} disabled={readOnly}>
            🔄
          </button>
          <button
            title={sortMode === 'total' ? 'Sort: Total Time (descending)' : 'Sort: Alphabetical'}
            onClick={onToggleSort}
            disabled={readOnly}
          >
            {sortMode === 'total' ? '🔢' : '🔠'}
          </button>
          <button title="Export all data" onClick={handleExportClick}>
            💾
          </button>
          <button title="Import user data" onClick={handleImportButtonClick} disabled={readOnly}>
            📥
          </button>
          <button
            title={readOnly ? 'Read-only mode (click to disable)' : 'Enable read-only mode'}
            onClick={onToggleReadOnly}
            className={`readonly-btn ${readOnly ? 'readonly-active' : ''}`}
          >
            {readOnly ? '🔒' : '🔓'}
          </button>
          <button
            title={deletionMode ? 'Delete all tasks' : 'Enable deletion mode'}
            className={`delete-btn ${deletionMode ? 'deletion-active' : ''}`}
            onClick={handleDeleteAllClick}
            disabled={readOnly}
          >
            🗑️
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,.json"
            style={{ display: 'none' }}
            data-default-file-name="clock-tasks"
            onChange={handleFileInputChange}
          />
        </div>
      </div>
    )
  } catch (error) {
    _.error = error
    throw error
  } finally {
    _.runTime = Number(new Date()) - Number(_.startedAt)
    if (_.error) {
      console.error('[Controls:error]', _)
    } else {
      console.debug('[Controls:success]', _)
    }
  }
}
