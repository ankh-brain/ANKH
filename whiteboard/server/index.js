import express from 'express'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import * as boards from './db.js'
import { listTemplates } from './templates.js'
import { EXPORT_DIR, DB_PATH, ensureDir } from './paths.js'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const PORT = Number(process.env.PORT || 4900)
const HOST = '127.0.0.1' // loopback only — this app is not meant to be reachable from the network

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

/* ------------------------------------------------------------- revisions -- */

app.get('/api/boards/:id/revisions', (req, res) => {
  if (!boards.getBoard(req.params.id)) return notFound(res)
  res.json({ kept: boards.REVISIONS_KEPT, revisions: boards.listRevisions(req.params.id) })
})

app.get('/api/boards/:id/revisions/:revisionId', (req, res) => {
  const revision = boards.getRevision(req.params.id, Number(req.params.revisionId))
  return revision ? res.json(revision) : res.status(404).json({ error: 'revision not found' })
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

app.listen(PORT, HOST, () => {
  console.log(`[whiteboard] api + app on http://${HOST}:${PORT}`)
  console.log(`[whiteboard] boards   ${DB_PATH}`)
  console.log(`[whiteboard] exports  ${EXPORT_DIR}`)
})
