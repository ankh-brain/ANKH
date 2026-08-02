import { useCallback, useEffect, useMemo, useState } from 'react'
import { Tldraw, type Editor, type TLComponents } from 'tldraw'
import { useSync } from '@tldraw/sync'
import { assetStore } from '../board/assetStore'
import { attachThumbnailSaver } from '../board/thumbnailSaver'
import { applyTemplate } from '../board/template'
import { BoardContextProvider, type BoardContextValue } from '../board/BoardContext'
import type { Board, Template } from '../types'

interface SharedCanvasProps {
  board: Board
  template: Template | null
  assetUrls: Parameters<typeof Tldraw>[0]['assetUrls']
  components: TLComponents
}

/**
 * A board backed by a sync room on the local server, so one other person on the
 * network can be on it at the same time. The server owns persistence here — it
 * saves the room's snapshot 2 seconds after the last change, the same rhythm as
 * solo autosave — so the client only sends thumbnails.
 */
export function SharedCanvas({ board, template, assetUrls, components }: SharedCanvasProps) {
  const [status, setStatus] = useState<'connecting' | 'online' | 'error'>('connecting')

  const uri = useMemo(() => {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:'
    return `${protocol}//${window.location.host}/api/sync/${board.id}`
  }, [board.id])

  const store = useSync({ uri, assets: assetStore })

  useEffect(() => {
    if (store.status === 'synced-remote') setStatus('online')
    else if (store.status === 'error') setStatus('error')
    else setStatus('connecting')
  }, [store])

  const handleMount = useCallback(
    (editor: Editor) => {
      const detach = attachThumbnailSaver(editor, board.id)
      // A template only ever lands on a board nobody has saved yet; on a shared
      // board the shapes travel to the other person through the room.
      if (template && editor.getCurrentPageShapeIds().size === 0) {
        applyTemplate(editor, template)
      }
      return detach
    },
    [board.id, template]
  )

  const boardContext = useMemo<BoardContextValue>(
    () => ({
      boardId: board.id,
      boardName: board.name,
      // The server is the one saving, so there is no local save state to show.
      saveState: status === 'online' ? 'saved' : 'pending',
      flush: async () => {},
      shared: true,
      connection: status,
    }),
    [board.id, board.name, status]
  )

  if (store.status === 'error') {
    const isFull = String(store.error?.message ?? '').includes('ROOM_FULL')
    return (
      <div className="screen screen--message">
        <h1>{isFull ? 'That board is full' : "Couldn't join that board"}</h1>
        <p className="muted">
          {isFull
            ? 'Two people are already on it — this board seats two.'
            : (store.error?.message ?? 'The sync connection failed.')}
        </p>
        <a className="button" href="#/">
          Back to boards
        </a>
      </div>
    )
  }

  return (
    <BoardContextProvider value={boardContext}>
      <Tldraw
        key={board.id}
        store={store}
        onMount={handleMount}
        components={components}
        assetUrls={assetUrls}
      />
    </BoardContextProvider>
  )
}
