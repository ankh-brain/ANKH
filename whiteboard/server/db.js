import Database from 'better-sqlite3'
import { randomUUID } from 'node:crypto'
import { DATA_DIR, DB_PATH, ensureDir } from './paths.js'

/** How many past snapshots to keep per board. */
export const REVISIONS_KEPT = 20

/**
 * Autosave fires 2s after the last edit, so a long editing session would churn
 * through all 20 revision slots in well under a minute. We keep the full
 * revision count but only open a *new* revision once a minute, which turns the
 * history into roughly the last 20 minutes of work instead of the last 40
 * seconds. Nothing is lost either way: the current snapshot is always saved.
 */
export const REVISION_MIN_INTERVAL_MS = Number(
  process.env.WHITEBOARD_REVISION_INTERVAL_MS ?? 60_000
)

ensureDir(DATA_DIR)

const db = new Database(DB_PATH)
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS boards (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    created_at  INTEGER NOT NULL,
    updated_at  INTEGER NOT NULL,
    snapshot    TEXT,
    thumbnail   TEXT
  );

  CREATE TABLE IF NOT EXISTS revisions (
    id          INTEGER PRIMARY KEY AUTOINCREMENT,
    board_id    TEXT NOT NULL REFERENCES boards(id) ON DELETE CASCADE,
    created_at  INTEGER NOT NULL,
    snapshot    TEXT NOT NULL
  );

  CREATE INDEX IF NOT EXISTS revisions_board_idx ON revisions (board_id, id DESC);
`)

const statements = {
  listBoards: db.prepare(
    `SELECT id, name, created_at, updated_at, thumbnail FROM boards ORDER BY updated_at DESC`
  ),
  getBoard: db.prepare(`SELECT * FROM boards WHERE id = ?`),
  insertBoard: db.prepare(
    `INSERT INTO boards (id, name, created_at, updated_at, snapshot, thumbnail)
     VALUES (@id, @name, @createdAt, @updatedAt, NULL, NULL)`
  ),
  renameBoard: db.prepare(`UPDATE boards SET name = ?, updated_at = ? WHERE id = ?`),
  deleteBoard: db.prepare(`DELETE FROM boards WHERE id = ?`),
  updateSnapshot: db.prepare(
    `UPDATE boards SET snapshot = ?, thumbnail = COALESCE(?, thumbnail), updated_at = ? WHERE id = ?`
  ),
  updateThumbnail: db.prepare(`UPDATE boards SET thumbnail = ? WHERE id = ?`),
  insertRevision: db.prepare(
    `INSERT INTO revisions (board_id, created_at, snapshot) VALUES (?, ?, ?)`
  ),
  latestRevisionAt: db.prepare(
    `SELECT created_at FROM revisions WHERE board_id = ? ORDER BY id DESC LIMIT 1`
  ),
  listRevisions: db.prepare(
    `SELECT id, created_at, length(snapshot) AS size FROM revisions
     WHERE board_id = ? ORDER BY id DESC`
  ),
  getRevision: db.prepare(`SELECT * FROM revisions WHERE id = ? AND board_id = ?`),
  pruneRevisions: db.prepare(
    `DELETE FROM revisions WHERE board_id = ? AND id NOT IN (
       SELECT id FROM revisions WHERE board_id = ? ORDER BY id DESC LIMIT ?
     )`
  ),
}

const toSummary = (row) => ({
  id: row.id,
  name: row.name,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
  thumbnail: row.thumbnail ?? null,
})

export function listBoards() {
  return statements.listBoards.all().map(toSummary)
}

export function getBoard(id) {
  const row = statements.getBoard.get(id)
  if (!row) return null
  return {
    ...toSummary(row),
    snapshot: row.snapshot ? JSON.parse(row.snapshot) : null,
  }
}

export function createBoard(name) {
  const now = Date.now()
  const board = { id: randomUUID(), name, createdAt: now, updatedAt: now }
  statements.insertBoard.run(board)
  return { ...board, thumbnail: null, snapshot: null }
}

export function renameBoard(id, name) {
  const result = statements.renameBoard.run(name, Date.now(), id)
  return result.changes > 0 ? getBoard(id) : null
}

export function deleteBoard(id) {
  return statements.deleteBoard.run(id).changes > 0
}

/**
 * Save the board's current snapshot, first filing the outgoing snapshot away as
 * a revision (subject to the throttle above) so there is always something to
 * roll back to.
 */
export const saveSnapshot = db.transaction((id, snapshot, thumbnail) => {
  const row = statements.getBoard.get(id)
  if (!row) return null

  const now = Date.now()
  if (row.snapshot) {
    const last = statements.latestRevisionAt.get(id)
    if (!last || now - last.created_at >= REVISION_MIN_INTERVAL_MS) {
      statements.insertRevision.run(id, row.updated_at, row.snapshot)
      statements.pruneRevisions.run(id, id, REVISIONS_KEPT)
    }
  }

  statements.updateSnapshot.run(JSON.stringify(snapshot), thumbnail ?? null, now, id)
  return { id, updatedAt: now }
})

/**
 * Thumbnails always come from a browser, because only a browser can render the
 * canvas. In shared mode the snapshot is saved server-side from the sync room,
 * so the thumbnail arrives on its own.
 */
export function saveThumbnail(id, thumbnail) {
  return statements.updateThumbnail.run(thumbnail, id).changes > 0
}

export function listRevisions(id) {
  return statements.listRevisions
    .all(id)
    .map((row) => ({ id: row.id, createdAt: row.created_at, size: row.size }))
}

export function getRevision(boardId, revisionId) {
  const row = statements.getRevision.get(revisionId, boardId)
  if (!row) return null
  return { id: row.id, createdAt: row.created_at, snapshot: JSON.parse(row.snapshot) }
}

export default db
