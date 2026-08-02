import { useCallback, useEffect, useState } from 'react'
import { loadSnapshot, useEditor } from 'tldraw'
import { api } from '../api'
import { exportBoard } from '../board/exportBoard'
import { useBoardContext } from '../board/BoardContext'
import type { SaveState } from '../board/autosave'
import type { Revision } from '../types'

const SAVE_LABELS: Record<SaveState, string> = {
  idle: 'Saved',
  pending: 'Saving…',
  saving: 'Saving…',
  saved: 'Saved',
  error: 'Save failed — retrying',
}

const CONNECTION_LABELS = {
  connecting: 'Connecting…',
  online: 'Shared',
  error: 'Disconnected',
} as const

function timeAgo(timestamp: number) {
  const seconds = Math.max(0, Math.round((Date.now() - timestamp) / 1000))
  if (seconds < 60) return `${seconds}s ago`
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return new Date(timestamp).toLocaleString()
}

/**
 * The panel tldraw renders in the canvas's top-right corner: save status, the
 * export button, and the revision history.
 */
export function BoardPanel() {
  const board = useBoardContext()
  const editor = useEditor()
  const [busy, setBusy] = useState<null | 'export' | 'restore'>(null)
  const [message, setMessage] = useState<string | null>(null)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [revisions, setRevisions] = useState<Revision[] | null>(null)

  const boardId = board?.boardId ?? ''
  const boardName = board?.boardName ?? ''
  const saveState: SaveState = board?.saveState ?? 'idle'
  const flush = board?.flush
  const shared = board?.shared ?? false
  const connection = board?.connection ?? 'online'

  useEffect(() => {
    if (!message) return
    const timer = setTimeout(() => setMessage(null), 6000)
    return () => clearTimeout(timer)
  }, [message])

  const handleExport = useCallback(async () => {
    setBusy('export')
    setMessage(null)
    try {
      await flush?.()
      const result = await exportBoard(editor, boardId)
      setMessage(`Exported to ${result.directory}/${boardName}.png + .svg`)
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Export failed')
    } finally {
      setBusy(null)
    }
  }, [boardId, boardName, editor, flush])

  const toggleHistory = useCallback(async () => {
    const next = !historyOpen
    setHistoryOpen(next)
    if (!next) return
    try {
      const result = await api.listRevisions(boardId)
      setRevisions(result.revisions)
    } catch {
      setRevisions([])
    }
  }, [boardId, historyOpen])

  const handleRestore = useCallback(
    async (revision: Revision) => {
      setBusy('restore')
      try {
        // Flush first so the state we're leaving becomes a revision of its own —
        // restoring is itself undoable.
        await flush?.()
        if (shared) {
          // The room owns the document, so the rollback has to come from the
          // server — it reaches the other person too.
          await api.restoreRevision(boardId, revision.id)
        } else {
          const { snapshot } = await api.getRevision(boardId, revision.id)
          loadSnapshot(editor.store, snapshot as Parameters<typeof loadSnapshot>[1])
        }
        setHistoryOpen(false)
        setMessage(`Restored the version from ${timeAgo(revision.createdAt)}`)
      } catch (error) {
        setMessage(error instanceof Error ? error.message : 'Restore failed')
      } finally {
        setBusy(null)
      }
    },
    [boardId, editor, flush, shared]
  )

  if (!board) return null

  return (
    <div className="board-panel">
      <div className="board-panel__row">
        <a className="board-panel__link" href="#/" title="Back to all boards">
          ← Boards
        </a>
        <span className="board-panel__name" title={boardName}>
          {boardName}
        </span>
        <span className={`board-panel__status board-panel__status--${saveState}`}>
          {shared ? CONNECTION_LABELS[connection] : SAVE_LABELS[saveState]}
        </span>
        <button
          className="board-panel__button"
          onClick={toggleHistory}
          disabled={busy !== null}
          title="Restore an earlier version of this board"
        >
          History
        </button>
        <button
          className="board-panel__button board-panel__button--primary"
          onClick={handleExport}
          disabled={busy !== null}
          title="Write PNG + SVG to your exports folder"
        >
          {busy === 'export' ? 'Exporting…' : 'Export'}
        </button>
      </div>

      {historyOpen && (
        <div className="board-panel__history">
          {revisions === null && <p className="board-panel__hint">Loading…</p>}
          {revisions?.length === 0 && (
            <p className="board-panel__hint">
              No earlier versions yet. One is filed away for each minute of editing.
            </p>
          )}
          {revisions?.map((revision) => (
            <button
              key={revision.id}
              className="board-panel__revision"
              onClick={() => handleRestore(revision)}
              disabled={busy !== null}
            >
              <span>{timeAgo(revision.createdAt)}</span>
              <span className="board-panel__revision-date">
                {new Date(revision.createdAt).toLocaleTimeString()}
              </span>
            </button>
          ))}
        </div>
      )}

      {message && <p className="board-panel__message">{message}</p>}
    </div>
  )
}
