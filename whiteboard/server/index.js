import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import os from 'node:os'
import * as boards from './db.js'
import { listTemplates } from './templates.js'
import { EXPORT_DIR, DB_PATH, DATA_DIR, ensureDir } from './paths.js'
import { attachSyncServer, getRoomStatus, applyRestoreToRoom, persistAllRooms, MAX_SESSIONS } from './sync.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.PORT || 4900)
/**
 * Sharing is off unless you ask for it. Without WHITEBOARD_SHARE the server
 * binds to loopback and never opens a WebSocket; with it, the server also
 * listens on your LAN address so one other person can join a board.
 */
const SHARE_ENABLED = process.env.WHITEBOARD_SHARE === '1'
const HOST = SHARE_ENABLED ? '0.0.0.0' : '127.0.0.1'
const ASSET_DIR = path.join(DATA_DIR, 'assets')

const app = express()
app.disable('x-powered-by')

// tldraw snapshots are chunky; a busy board runs to a few MB of JSON.
app.use(express.json({ limit: '64mb' }))

const asyncRoute = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next)

const notFound = (res) => res.status(404).json({ error: 'board not found' })

function readName(body) {
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  return name.slice(0, 120)
}

/* ---------------------------------------------------------------- boards -- */

app.get('/api/boards', (_req, res) => {
  res.json(boards.listBoards())
})

app.get('/api/boards/:id', (req, res) => {
  const board = boards.getBoard(req.params.id)
  return board ? res.json(board) : notFound(res)
})

app.post('/api/boards', (req, res) => {
  const name = readName(req.body) || 'Untitled board'
  res.status(201).json(boards.createBoard(name))
})

app.patch('/api/boards/:id', (req, res) => {
  const name = readName(req.body)
  if (!name) return res.status(400).json({ error: 'name is required' })
  const board = boards.renameBoard(req.params.id, name)
  return board ? res.json(board) : notFound(res)
})

app.delete('/api/boards/:id', (req, res) => {
  return boards.deleteBoard(req.params.id) ? res.status(204).end() : notFound(res)
})

app.put('/api/boards/:id/snapshot', (req, res) => {
  const { snapshot, thumbnail } = req.body ?? {}
  if (!snapshot || typeof snapshot !== 'object') {
    return res.status(400).json({ error: 'snapshot is required' })
  }
  const saved = boards.saveSnapshot(
    req.params.id,
    snapshot,
    typeof thumbnail === 'string' ? thumbnail : null
  )
  return saved ? res.json(saved) : notFound(res)
})

app.put('/api/boards/:id/thumbnail', (req, res) => {
  const { thumbnail } = req.body ?? {}
  if (typeof thumbnail !== 'string') {
    return res.status(400).json({ error: 'thumbnail is required' })
  }
  return boards.saveThumbnail(req.params.id, thumbnail) ? res.status(204).end() : notFound(res)
})

/* ------------------------------------------------------------- revisions -- */

app.get('/api/boards/:id/revisions', (req, res) => {
  if (!boards.getBoard(req.params.id)) return notFound(res)
  res.json({ kept: boards.REVISIONS_KEPT, revisions: boards.listRevisions(req.params.id) })
})

app.get('/api/boards/:id/revisions/:revisionId', (req, res) => {
  const revision = boards.getRevision(req.params.id, Number(req.params.revisionId))
  return revision ? res.json(revision) : res.status(404).json({ error: 'revision not found' })
})

app.post('/api/boards/:id/restore', (req, res) => {
  const board = boards.getBoard(req.params.id)
  if (!board) return notFound(res)

  const revision = boards.getRevision(req.params.id, Number(req.body?.revisionId))
  if (!revision) return res.status(404).json({ error: 'revision not found' })

  // Saving first files the state we're leaving away as a revision of its own,
  // so restoring is itself undoable.
  boards.saveSnapshot(req.params.id, revision.snapshot, null)

  // If anyone is connected to this board right now, push the rollback to them
  // rather than letting their live room overwrite what we just restored.
  const appliedToRoom = SHARE_ENABLED && applyRestoreToRoom(req.params.id, revision.snapshot)

  res.json({ restored: revision.id, appliedToRoom })
})

/* ------------------------------------------------------------- templates -- */

app.get('/api/templates', (_req, res) => {
  res.json(listTemplates())
})

/* --------------------------------------------------------------- exports -- */

/** Keep the export inside EXPORT_DIR no matter what a board is called. */
function exportFileName(name) {
  const cleaned = name
    .replace(/[\u0000-\u001f/\\:*?"<>|]/g, '-')
    .replace(/\s+/g, ' ')
    .replace(/^[.\s]+|[.\s]+$/g, '')
  return cleaned.slice(0, 100).trim() || 'board'
}

app.post('/api/boards/:id/export', (req, res) => {
  const board = boards.getBoard(req.params.id)
  if (!board) return notFound(res)

  const { png, svg } = req.body ?? {}
  if (typeof png !== 'string' && typeof svg !== 'string') {
    return res.status(400).json({ error: 'nothing to export' })
  }

  ensureDir(EXPORT_DIR)
  const base = exportFileName(board.name)
  const written = []

  if (typeof png === 'string' && png.length > 0) {
    const target = path.join(EXPORT_DIR, `${base}.png`)
    const base64 = png.startsWith('data:') ? png.slice(png.indexOf(',') + 1) : png
    fs.writeFileSync(target, Buffer.from(base64, 'base64'))
    written.push(target)
  }

  if (typeof svg === 'string' && svg.length > 0) {
    const target = path.join(EXPORT_DIR, `${base}.svg`)
    fs.writeFileSync(target, svg, 'utf8')
    written.push(target)
  }

  res.json({ files: written, directory: EXPORT_DIR })
})

/* ---------------------------------------------------------------- share --- */

/** The address a second person would type in, when sharing is on. */
function lanAddress() {
  for (const entries of Object.values(os.networkInterfaces())) {
    for (const entry of entries ?? []) {
      if (entry.family === 'IPv4' && !entry.internal) return entry.address
    }
  }
  return null
}

app.get('/api/share', (_req, res) => {
  const address = SHARE_ENABLED ? lanAddress() : null
  res.json({
    enabled: SHARE_ENABLED,
    maxPeers: MAX_SESSIONS,
    url: address ? `http://${address}:${PORT}` : null,
  })
})

app.get('/api/boards/:id/peers', (req, res) => {
  res.json(SHARE_ENABLED ? getRoomStatus(req.params.id) : { peers: 0, max: MAX_SESSIONS })
})

/* --------------------------------------------------------------- assets --- */

/**
 * Images pasted onto a shared board have to live somewhere both browsers can
 * reach, so they're written next to the database rather than inlined as base64.
 */
const assetName = (name) => name.replace(/[^a-zA-Z0-9._-]/g, '-').slice(0, 120)

app.post(
  '/api/assets/:name',
  express.raw({ type: '*/*', limit: '64mb' }),
  (req, res) => {
    const name = assetName(req.params.name)
    if (!name || !Buffer.isBuffer(req.body) || req.body.length === 0) {
      return res.status(400).json({ error: 'no asset body' })
    }
    ensureDir(ASSET_DIR)
    fs.writeFileSync(path.join(ASSET_DIR, name), req.body)
    res.json({ src: `/api/assets/${encodeURIComponent(name)}` })
  }
)

app.get('/api/assets/:name', (req, res) => {
  const target = path.join(ASSET_DIR, assetName(req.params.name))
  if (!fs.existsSync(target)) return res.status(404).json({ error: 'asset not found' })
  res.sendFile(target)
})

/* ----------------------------------------------------------------- meta --- */

app.get('/api/where', (_req, res) => {
  res.json({ database: DB_PATH, exports: EXPORT_DIR })
})

/* ------------------------------------------------------- static frontend -- */

const DIST = path.join(ROOT, 'dist')
if (fs.existsSync(DIST)) {
  app.use(express.static(DIST))
  // Anything that isn't an API call is handled by the client-side router.
  app.get(/^\/(?!api\/).*/, (_req, res) => res.sendFile(path.join(DIST, 'index.html')))
} else {
  app.get('/', (_req, res) =>
    res
      .status(503)
      .type('text/plain')
      .send('No build found. Run `npm run dev` for the dev server, or `npm run build` first.')
  )
}

app.use((error, _req, res, _next) => {
  console.error('[whiteboard]', error)
  res.status(500).json({ error: error.message })
})

const server = app.listen(PORT, HOST, () => {
  console.log(`[whiteboard] api + app on http://127.0.0.1:${PORT}`)
  console.log(`[whiteboard] boards   ${DB_PATH}`)
  console.log(`[whiteboard] exports  ${EXPORT_DIR}`)
  if (SHARE_ENABLED) {
    const address = lanAddress()
    console.log(
      `[whiteboard] sharing ON — up to ${MAX_SESSIONS} people` +
        (address ? `, join at http://${address}:${PORT}` : ' (no LAN address found)')
    )
  }
})

if (SHARE_ENABLED) attachSyncServer(server)

/** Don't lose the last couple of seconds of a shared board on Ctrl-C. */
function shutdown() {
  if (SHARE_ENABLED) persistAllRooms()
  server.close(() => process.exit(0))
  // Don't hang forever on a socket that won't close.
  setTimeout(() => process.exit(0), 2000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
