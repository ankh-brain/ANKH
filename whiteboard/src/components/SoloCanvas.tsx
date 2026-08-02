import { useCallback, useMemo, useRef, useState } from 'react'
import { Tldraw, type Editor, type TLComponents, type TLEditorSnapshot } from 'tldraw'
import { attachAutosave, type SaveState } from '../board/autosave'
import { applyTemplate } from '../board/template'
import { BoardContextProvider, type BoardContextValue } from '../board/BoardContext'
import type { Board, Template } from '../types'

interface SoloCanvasProps {
  board: Board
  template: Template | null
  assetUrls: Parameters<typeof Tldraw>[0]['assetUrls']
  components: TLComponents
}

/**
 * The default board: nobody else is connected, the browser owns the document,
 * and the debounced autosave writes snapshots to the local API.
 */
export function SoloCanvas({ board, template, assetUrls, components }: SoloCanvasProps) {
  const [saveState, setSaveState] = useState<SaveState>('idle')
  const autosaveRef = useRef<ReturnType<typeof attachAutosave> | null>(null)

  const flush = useCallback(async () => {
    await autosaveRef.current?.flush()
  }, [])

  const handleMount = useCallback(
    (editor: Editor) => {
      const autosave = attachAutosave(editor, board.id, setSaveState)
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
    [board.id, template]
  )

  const boardContext = useMemo<BoardContextValue>(
    () => ({
      boardId: board.id,
      boardName: board.name,
      saveState,
      flush,
      shared: false,
      connection: 'online',
    }),
    [board.id, board.name, saveState, flush]
  )

  return (
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
  )
}
