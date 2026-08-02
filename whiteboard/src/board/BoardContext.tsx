import { createContext, useContext } from 'react'
import type { SaveState } from './autosave'

export interface BoardContextValue {
  boardId: string
  boardName: string
  saveState: SaveState
  /** Flushes any pending autosave — used before exporting and before restoring. */
  flush: () => Promise<void>
}

const BoardContext = createContext<BoardContextValue | null>(null)

export const BoardContextProvider = BoardContext.Provider

/**
 * Lets the in-canvas panel read board state without being re-created whenever
 * that state changes — tldraw's `components` map has to stay referentially
 * stable or the panel remounts (and loses its open menus) on every autosave.
 */
export function useBoardContext(): BoardContextValue | null {
  return useContext(BoardContext)
}
