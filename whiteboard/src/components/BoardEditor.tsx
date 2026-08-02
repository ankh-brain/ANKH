import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Tldraw, type Editor, type TLComponents, type TLEditorSnapshot } from 'tldraw'
import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { api } from '../api'
import { attachAutosave, type SaveState } from '../board/autosave'
import { applyTemplate } from '../board/template'
import { BoardContextProvider, type BoardContextValue } from '../board/BoardContext'
import { BoardPanel } from './BoardPanel'
import type { Board, Template } from '../types'

/**
 * Fonts, icons and translations bundled into our own build. Without this tldraw
 * fetches them from its CDN at runtime, which would leave the app broken
 * offline. Defined at module scope because tldraw requires a stable reference.
 */
const assetUrls = getAssetUrlsByImport()

interface BoardEditorProps {
  boardId: string
  /** Template to seed a brand new board with, taken from the url. */
  templateId?: string
}

export function BoardEditor({ boardId, templateId }: BoardEditorProps) {
  const [board, setBoard] = useState<Board | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [saveState, setSaveState] = useState<SaveState>('idle')

  const autosaveRef = useRef<ReturnType<typeof attachAutosave> | null>(null)

  useEffect(() => {
    let cancelled = false
    setBoard(null)
    setTemplate(null)
    setError(null)

    Promise.all([
      api.getBoard(boardId),
      templateId
        ? api.listTemplates().then((all) => all.find((t) => t.id === templateId) ?? null)
        : Promise.resolve(null),
    ])
      .then(([loadedBoard, loadedTemplate]) => {
        if (cancelled) return
        setBoard(loadedBoard)
        // Only seed a template into a board that has never been saved, so a
        // stale url can't stamp a template over real work.
        setTemplate(loadedBoard.snapshot ? null : loadedTemplate)
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not open board')
      })

    return () => {
      cancelled = true
    }
  }, [boardId, templateId])

  useEffect(() => {
    if (board) document.title = `${board.name} — Whiteboard`
    return () => {
      document.title = 'Whiteboard'
    }
  }, [board])

  const flush = useCallback(async () => {
    await autosaveRef.current?.flush()
  }, [])

  const handleMount = useCallback(
    (editor: Editor) => {
      const autosave = attachAutosave(editor, boardId, setSaveState)
      autosaveRef.current = autosave

      if (template) {
        applyTemplate(editor, template)
        // The template is only in memory until this first save lands.
        autosave.touch()
      }

      return () => {
        autosave.dispose()
        autosaveRef.current = null
      }
    },
    [boardId, template]
  )

  // Must stay referentially stable: tldraw remounts these on identity change.
  const components = useMemo<TLComponents>(() => ({ SharePanel: BoardPanel }), [])

  const boardContext = useMemo<BoardContextValue | null>(
    () =>
      board
        ? { boardId: board.id, boardName: board.name, saveState, flush }
        : null,
    [board, saveState, flush]
  )

  if (error) {
    return (
      <div className="screen screen--message">
        <h1>Couldn't open that board</h1>
        <p>{error}</p>
        <a className="button" href="#/">
          Back to boards
        </a>
      </div>
    )
  }

  if (!board) {
    return (
      <div className="screen screen--message">
        <p className="muted">Opening board…</p>
      </div>
    )
  }

  return (
    <div className="board-editor">
      <BoardContextProvider value={boardContext}>
        <Tldraw
          // Remounting per board keeps each board's store cleanly separated.
          key={board.id}
          snapshot={(board.snapshot as TLEditorSnapshot) ?? undefined}
          onMount={handleMount}
          components={components}
          assetUrls={assetUrls}
        />
      </BoardContextProvider>
    </div>
  )
}
