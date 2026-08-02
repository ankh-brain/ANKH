import { useEffect, useMemo, useState } from 'react'
import { type TLComponents } from 'tldraw'
import { getAssetUrlsByImport } from '@tldraw/assets/imports.vite'
import { api } from '../api'
import { BoardPanel } from './BoardPanel'
import { SoloCanvas } from './SoloCanvas'
import { SharedCanvas } from './SharedCanvas'
import type { Board, ShareInfo, Template } from '../types'

/**
 * Fonts, icons and translations bundled into our own build. Without this tldraw
 * fetches them from its CDN at runtime, which would leave the app broken
 * offline. Defined at module scope because tldraw requires a stable reference.
 */
const assetUrls = getAssetUrlsByImport()

/** Must stay referentially stable: tldraw remounts these on identity change. */
const components: TLComponents = { SharePanel: BoardPanel }

interface BoardEditorProps {
  boardId: string
  /** Template to seed a brand new board with, taken from the url. */
  templateId?: string
}

export function BoardEditor({ boardId, templateId }: BoardEditorProps) {
  const [board, setBoard] = useState<Board | null>(null)
  const [template, setTemplate] = useState<Template | null>(null)
  const [share, setShare] = useState<ShareInfo | null>(null)
  const [error, setError] = useState<string | null>(null)

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
      api.share().catch(() => ({ enabled: false, maxPeers: 2, url: null }) as ShareInfo),
    ])
      .then(([loadedBoard, loadedTemplate, shareInfo]) => {
        if (cancelled) return
        setBoard(loadedBoard)
        setShare(shareInfo)
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

  const canvas = useMemo(() => {
    if (!board || !share) return null
    // Sharing is a property of how the server was started, not of the board:
    // with it off there is no socket and nothing to join.
    return share.enabled ? (
      <SharedCanvas
        board={board}
        template={template}
        assetUrls={assetUrls}
        components={components}
      />
    ) : (
      <SoloCanvas board={board} template={template} assetUrls={assetUrls} components={components} />
    )
  }, [board, share, template])

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

  if (!canvas) {
    return (
      <div className="screen screen--message">
        <p className="muted">Opening board…</p>
      </div>
    )
  }

  return <div className="board-editor">{canvas}</div>
}
