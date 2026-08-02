import { WebSocketServer } from 'ws'
import {
  TLSocketRoom,
  TLSyncErrorCloseEventCode,
  TLSyncErrorCloseEventReason,
} from '@tldraw/sync-core'
import * as boards from './db.js'

/**
 * Two people, and no more. The whole point of this mode is "let me and one
 * other person think on the same canvas" — anything past that is a venue.
 */
export const MAX_SESSIONS = 2

/** Matches the solo autosave: persist 2 seconds after the last change. */
const SAVE_DEBOUNCE_MS = 2000

/** Live rooms, keyed by board id. A room exists only while someone is connected. */
const rooms = new Map()

/**
 * The room speaks RoomSnapshot; the rest of the app speaks the editor snapshot
 * that `getSnapshot(editor.store)` produces. Both agree on the `document` half,
 * so converting between them keeps a board readable whichever mode last touched
 * it.
 */
function roomSnapshotToStored(roomSnapshot) {
  const store = {}
  for (const { state } of roomSnapshot.documents) store[state.id] = state
  return { document: { store, schema: roomSnapshot.schema } }
}

function storedToRoomInput(stored) {
  if (!stored) return undefined
  // Solo mode saves { document, session }; we only want the document half.
  return stored.document ?? stored
}

function persist(boardId) {
  const entry = rooms.get(boardId)
  if (!entry) return

  if (entry.saveTimer) {
    clearTimeout(entry.saveTimer)
    entry.saveTimer = null
  }

  try {
    boards.saveSnapshot(boardId, roomSnapshotToStored(entry.room.getCurrentSnapshot()), null)
  } catch (error) {
    console.error(`[whiteboard] failed to persist shared board ${boardId}:`, error)
  }
}

function schedulePersist(boardId) {
  const entry = rooms.get(boardId)
  if (!entry) return
  if (entry.saveTimer) clearTimeout(entry.saveTimer)
  entry.saveTimer = setTimeout(() => persist(boardId), SAVE_DEBOUNCE_MS)
}

function getOrCreateRoom(boardId) {
  const existing = rooms.get(boardId)
  if (existing) return existing

  const board = boards.getBoard(boardId)
  if (!board) return null

  const entry = { room: null, saveTimer: null }
  entry.room = new TLSocketRoom({
    initialSnapshot: storedToRoomInput(board.snapshot),
    onDataChange: () => schedulePersist(boardId),
    onSessionRemoved: (room, { numSessionsRemaining }) => {
      if (numSessionsRemaining > 0) return
      // Last person left: save immediately and let the room go.
      persist(boardId)
      room.close()
      rooms.delete(boardId)
    },
  })

  rooms.set(boardId, entry)
  return entry
}

/** Used by the restore endpoint so a rollback reaches anyone currently connected. */
export function getLiveRoom(boardId) {
  return rooms.get(boardId)?.room ?? null
}

export function applyRestoreToRoom(boardId, storedSnapshot) {
  const room = getLiveRoom(boardId)
  if (!room) return false
  room.loadSnapshot(storedToRoomInput(storedSnapshot))
  persist(boardId)
  return true
}

export function getRoomStatus(boardId) {
  const room = getLiveRoom(boardId)
  return { peers: room ? room.getNumActiveSessions() : 0, max: MAX_SESSIONS }
}

/** Flush every live room — used when the process is shutting down. */
export function persistAllRooms() {
  for (const boardId of [...rooms.keys()]) persist(boardId)
}

/**
 * Attaches the sync WebSocket endpoint to an http server. Only called when
 * sharing is switched on; without it the app never opens a socket at all.
 */
export function attachSyncServer(httpServer) {
  const wss = new WebSocketServer({ noServer: true })

  httpServer.on('upgrade', (request, socket, head) => {
    let url
    try {
      url = new URL(request.url, 'http://localhost')
    } catch {
      socket.destroy()
      return
    }

    const match = /^\/api\/sync\/([^/]+)$/.exec(url.pathname)
    if (!match) {
      socket.destroy()
      return
    }

    const boardId = decodeURIComponent(match[1])
    // useSync adds these itself; sessionId identifies the browser tab.
    const sessionId = url.searchParams.get('sessionId')
    if (!sessionId) {
      socket.destroy()
      return
    }

    wss.handleUpgrade(request, socket, head, (ws) => {
      const entry = getOrCreateRoom(boardId)
      if (!entry) {
        ws.close(TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason.NOT_FOUND)
        return
      }

      // Sessions linger for a moment after a socket drops, so a tab that is
      // merely reconnecting already holds a slot — don't count it twice and
      // lock the person out of their own board.
      const isReconnect = entry.room
        .getSessions()
        .some((session) => session.sessionId === sessionId)

      if (!isReconnect && entry.room.getNumActiveSessions() >= MAX_SESSIONS) {
        ws.close(TLSyncErrorCloseEventCode, TLSyncErrorCloseEventReason.ROOM_FULL)
        return
      }

      entry.room.handleSocketConnect({ sessionId, socket: ws })
    })
  })

  return wss
}
