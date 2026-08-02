import type { Board, BoardSummary, Revision, ShareInfo, Template } from './types'
import retroGrid from '../templates/retro-grid.json'
import brainstormColumns from '../templates/brainstorm-columns.json'
import weeklyPlan from '../templates/weekly-plan.json'

/**
 * A stand-in for the real API, used only by the single-file preview build
 * (`npm run preview:build`). Everything lives in the browser's localStorage
 * instead of SQLite so the whole app can be opened from one HTML file with no
 * server behind it.
 *
 * This exists to let someone click around the UI. It is NOT the app: the real
 * one saves to SQLite, writes exports to disk, and can be shared with another
 * person. Vite swaps this module in only when VITE_PREVIEW is set, so it never
 * reaches the production bundle.
 */

const STORAGE_KEY = 'whiteboard-preview-v1'
const REVISIONS_KEPT = 20

interface PreviewRecord extends BoardSummary {
  snapshot: unknown | null
  revisions: { id: number; createdAt: number; snapshot: unknown }[]
}

interface PreviewState {
  boards: PreviewRecord[]
  nextRevisionId: number
}

function read(): PreviewState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return JSON.parse(raw) as PreviewState
  } catch {
    // Corrupt or unavailable storage just means we start fresh.
  }
  return { boards: [], nextRevisionId: 1 }
}

function write(state: PreviewState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state))
  } catch (error) {
    // Snapshots can outgrow the ~5MB localStorage quota on a busy board. The
    // canvas keeps working; only persistence across reloads is lost.
    console.warn('[whiteboard preview] could not save — storage is full', error)
  }
}

const summarize = (board: PreviewRecord): BoardSummary => ({
  id: board.id,
  name: board.name,
  createdAt: board.createdAt,
  updatedAt: board.updatedAt,
  thumbnail: board.thumbnail,
})

const templates = [retroGrid, brainstormColumns, weeklyPlan] as unknown as Template[]

function find(state: PreviewState, id: string) {
  const board = state.boards.find((entry) => entry.id === id)
  if (!board) throw new Error('board not found')
  return board
}

function triggerDownload(dataUrl: string, filename: string) {
  const link = document.createElement('a')
  link.href = dataUrl
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
}

export const api = {
  async listBoards(): Promise<BoardSummary[]> {
    return read()
      .boards.slice()
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .map(summarize)
  },

  async getBoard(id: string): Promise<Board> {
    const board = find(read(), id)
    return { ...summarize(board), snapshot: board.snapshot }
  },

  async createBoard(name: string): Promise<Board> {
    const state = read()
    const now = Date.now()
    const board: PreviewRecord = {
      id: crypto.randomUUID(),
      name,
      createdAt: now,
      updatedAt: now,
      thumbnail: null,
      snapshot: null,
      revisions: [],
    }
    state.boards.push(board)
    write(state)
    return { ...summarize(board), snapshot: null }
  },

  async renameBoard(id: string, name: string): Promise<Board> {
    const state = read()
    const board = find(state, id)
    board.name = name
    board.updatedAt = Date.now()
    write(state)
    return { ...summarize(board), snapshot: board.snapshot }
  },

  async deleteBoard(id: string): Promise<void> {
    const state = read()
    state.boards = state.boards.filter((entry) => entry.id !== id)
    write(state)
  },

  async saveSnapshot(id: string, snapshot: unknown, thumbnail: string | null) {
    const state = read()
    const board = find(state, id)

    if (board.snapshot) {
      board.revisions.unshift({
        id: state.nextRevisionId++,
        createdAt: board.updatedAt,
        snapshot: board.snapshot,
      })
      board.revisions = board.revisions.slice(0, REVISIONS_KEPT)
    }

    board.snapshot = snapshot
    if (thumbnail) board.thumbnail = thumbnail
    board.updatedAt = Date.now()
    write(state)
    return { updatedAt: board.updatedAt }
  },

  async saveThumbnail(id: string, thumbnail: string): Promise<void> {
    const state = read()
    find(state, id).thumbnail = thumbnail
    write(state)
  },

  async listRevisions(id: string): Promise<{ kept: number; revisions: Revision[] }> {
    const board = find(read(), id)
    return {
      kept: REVISIONS_KEPT,
      revisions: board.revisions.map(({ id: revisionId, createdAt }) => ({
        id: revisionId,
        createdAt,
      })),
    }
  },

  async getRevision(id: string, revisionId: number) {
    const board = find(read(), id)
    const revision = board.revisions.find((entry) => entry.id === revisionId)
    if (!revision) throw new Error('revision not found')
    return revision
  },

  async restoreRevision(id: string, revisionId: number) {
    const revision = await this.getRevision(id, revisionId)
    await this.saveSnapshot(id, revision.snapshot, null)
    return { restored: revisionId, appliedToRoom: false }
  },

  async listTemplates(): Promise<Template[]> {
    return templates
  },

  /**
   * The real app hands the images to the server, which writes them to
   * ~/Whiteboards. With no server, the best a preview can do is download them.
   */
  async exportBoard(id: string, payload: { png?: string; svg?: string }) {
    const board = find(read(), id)
    const safeName = board.name.replace(/[^a-zA-Z0-9._ -]/g, '-') || 'board'

    if (payload.png) triggerDownload(payload.png, `${safeName}.png`)
    if (payload.svg) {
      const url = URL.createObjectURL(new Blob([payload.svg], { type: 'image/svg+xml' }))
      triggerDownload(url, `${safeName}.svg`)
      URL.revokeObjectURL(url)
    }

    return { files: [`${safeName}.png`, `${safeName}.svg`], directory: 'your downloads folder' }
  },

  async share(): Promise<ShareInfo> {
    // Sharing needs the server; there isn't one here.
    return { enabled: false, maxPeers: 2, url: null }
  },

  async peers() {
    return { peers: 0, max: 2 }
  },

  async where() {
    return { database: 'this browser (preview only)', exports: 'your downloads folder' }
  },
}

export function saveSnapshotBeacon(id: string, snapshot: unknown, thumbnail: string | null) {
  void api.saveSnapshot(id, snapshot, thumbnail)
}
