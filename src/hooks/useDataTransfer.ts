import type { TaskManagerState, StoredData } from '@/core'
import { serializeData, deserializeData, validateData } from '@/core/storageCore'

// Utilities
const getSnapshotPromise = getStoredSnapshot
const downloadPromise = triggerJsonDownload
const parsePromise = parseStoredData
const fileReaderPromise = readFileAsText

interface DataTransferParams {
  state: TaskManagerState
  setState: (state: TaskManagerState) => void
  sortMode: 'total' | 'alphabetical'
  setSortMode: (mode: 'total' | 'alphabetical') => void
  syncToStorage: (fileId: string | null, data: StoredData) => Promise<void>
  driveFileId: string | null
  readOnly: boolean
}

interface DataTransferHandlers {
  handleExportData: () => Promise<StoredData>
  handleImportData: (file: File) => Promise<StoredData | void>
}

const LOG_PREFIX_FILE = '[clock-tasks][useDataTransfer]'

// Main
export function useDataTransfer(params: DataTransferParams): DataTransferHandlers {
  const _ = { params, startedAt: new Date() }
  try {
    return {
      handleExportData: () => exportDataFlow(params.state, params.sortMode),
      handleImportData: (file: File) =>
        importDataFlow({
          file,
          sortMode: params.sortMode,
          readOnly: params.readOnly,
          setState: params.setState,
          setSortMode: params.setSortMode,
          syncToStorage: params.syncToStorage,
          driveFileId: params.driveFileId
        })
    }
  } catch (error) {
    _.error = error
    throw error
  } finally {
    _.runTime = Number(new Date()) - Number(_.startedAt)
    if (_.error) {
      console.error('[useDataTransfer:error]', _)
    } else {
      console.debug('[useDataTransfer:success]', _)
    }
  }
}

// Helpers
async function exportDataFlow(state: TaskManagerState, sortMode: 'total' | 'alphabetical') {
  const _ = { sortMode, startedAt: new Date() }
  try {
    const snapshot = await getSnapshotPromise({ state, sortMode })
    await downloadPromise(snapshot, 'clock-tasks.json')
    return snapshot.data
  } catch (error) {
    _.error = error
    throw error
  } finally {
    _.runTime = Number(new Date()) - Number(_.startedAt)
    if (_.error) {
      console.error('[exportDataFlow:error]', _)
    } else {
      console.debug('[exportDataFlow:success]', _)
    }
  }
}

async function importDataFlow(args: {
  file: File
  sortMode: 'total' | 'alphabetical'
  readOnly: boolean
  setState: (state: TaskManagerState) => void
  setSortMode: (mode: 'total' | 'alphabetical') => void
  syncToStorage: (fileId: string | null, data: StoredData) => Promise<void>
  driveFileId: string | null
}) {
  const _ = { fileName: args.file.name, startedAt: new Date() }
  try {
    if (args.readOnly) {
      console.debug('[importDataFlow:status]', `${LOG_PREFIX_FILE} Import blocked: read-only mode`, _)
      return
    }

    const raw = await fileReaderPromise(args.file)
    const parsed = await parsePromise(raw)

    const confirmation = window.confirm(
      'Importing will permanently replace all tasks across devices and cannot be undone. Continue?'
    )
    if (!confirmation) {
      console.debug('[importDataFlow:status]', `${LOG_PREFIX_FILE} User cancelled import confirmation`, _)
      return
    }

    const sanitized: StoredData = {
      tasks: parsed.tasks,
      history: parsed.history,
      lastModified: Date.now(),
      sortMode: parsed.sortMode ?? args.sortMode
    }

    args.setState({
      tasks: sanitized.tasks,
      history: sanitized.history,
      lastModified: sanitized.lastModified
    })

    if (sanitized.sortMode && sanitized.sortMode !== args.sortMode) {
      args.setSortMode(sanitized.sortMode)
    }

    await args.syncToStorage(args.driveFileId, sanitized)
    return sanitized
  } catch (error) {
    _.error = error
    throw error
  } finally {
    _.runTime = Number(new Date()) - Number(_.startedAt)
    if (_.error) {
      console.error('[importDataFlow:error]', _)
    } else {
      console.debug('[importDataFlow:success]', _)
    }
  }
}

async function getStoredSnapshot(args: { state: TaskManagerState; sortMode: 'total' | 'alphabetical' }) {
  const _ = { args, startedAt: new Date() }
  try {
    const data: StoredData = {
      tasks: args.state.tasks,
      history: args.state.history,
      lastModified: args.state.lastModified,
      sortMode: args.sortMode
    }
    return { data, serialized: serializeData(validateData(data)) }
  } catch (error) {
    _.error = error
    throw error
  } finally {
    _.runTime = Number(new Date()) - Number(_.startedAt)
    if (_.error) {
      console.error('[getStoredSnapshot:error]', _)
    } else {
      console.debug('[getStoredSnapshot:success]', _)
    }
  }
}

async function triggerJsonDownload(
  snapshot: { data: StoredData; serialized: string },
  fileName: string
): Promise<void> {
  const _ = { snapshot, fileName, startedAt: new Date() }
  try {
    const blob = new Blob([snapshot.serialized], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = fileName
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    URL.revokeObjectURL(url)
  } catch (error) {
    _.error = error
    throw error
  } finally {
    _.runTime = Number(new Date()) - Number(_.startedAt)
    if (_.error) {
      console.error('[triggerJsonDownload:error]', _)
    } else {
      console.debug('[triggerJsonDownload:success]', _)
    }
  }
}

async function parseStoredData(raw: string): Promise<StoredData> {
  const _ = { rawLength: raw.length, startedAt: new Date() }
  try {
    const data = validateData(deserializeData(raw))
    return data
  } catch (error) {
    _.error = error
    throw error
  } finally {
    _.runTime = Number(new Date()) - Number(_.startedAt)
    if (_.error) {
      console.error('[parseStoredData:error]', _)
    } else {
      console.debug('[parseStoredData:success]', _)
    }
  }
}

async function readFileAsText(file: File): Promise<string> {
  const _ = { fileName: file.name, startedAt: new Date() }
  try {
    const content = await file.text()
    return content
  } catch (error) {
    _.error = error
    throw error
  } finally {
    _.runTime = Number(new Date()) - Number(_.startedAt)
    if (_.error) {
      console.error('[readFileAsText:error]', _)
    } else {
      console.debug('[readFileAsText:success]', _)
    }
  }
}
