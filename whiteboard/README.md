# Whiteboard

A personal thinking canvas that runs on your own machine. Built on the
[tldraw SDK](https://tldraw.dev) — shapes, sticky notes, connectors, freehand
drawing and selection all come from tldraw; this repo adds the parts tldraw
doesn't have opinions about: named boards, autosave to SQLite, revision history,
disk exports, and templates.

No accounts, no telemetry, no cloud. It binds to `127.0.0.1` and works with the
network unplugged. If you want, one other person on your network can join a
board with you — that's opt-in and off by default.

## Running it

```bash
cd whiteboard
npm install
npm run dev          # http://localhost:4900
```

`npm run dev` starts two processes: the API server on 4901 and Vite on 4900,
with `/api` proxied across. The app is at **http://localhost:4900** either way.

For the version you'd actually leave running day to day:

```bash
npm run build        # typechecks, then bundles to dist/
npm start            # serves the app *and* the API on http://localhost:4900
```

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server on 4900 + API on 4901, hot reload |
| `npm run build` | `tsc --noEmit` then a production bundle into `dist/` |
| `npm start` | Serves `dist/` and the API together on 4900, loopback only |
| `npm run share` | Same, but also reachable on your network — see [Sharing](#sharing-with-one-other-person) |
| `npm run server` | The API alone (same as `npm start`) |

## Where your data lives

| What | Where | Override |
| --- | --- | --- |
| Boards, snapshots, history | `~/.whiteboard/boards.db` | `WHITEBOARD_DATA_DIR` |
| PNG / SVG exports | `~/Whiteboards/<board-name>.png` (and `.svg`) | `WHITEBOARD_EXPORT_DIR` |

It's one SQLite file (plus the usual `-wal` / `-shm` companions). Back it up by
copying it; move it to another machine and your boards come with it. The board
picker prints both paths in its footer, and `GET /api/where` returns them.

Two boards with the same name export to the same file — the second overwrites
the first. Names are sanitized so an adventurous board title can't write outside
the export directory.

## How saving works

Every change starts a 2-second timer; when it runs out, the board's tldraw
snapshot is written to SQLite along with a fresh thumbnail. The status in the
top-right corner reads `Saving…` while a write is in flight and `Saved` when it
lands. A save is also forced when you hide the tab, leave the board, or export.

**Revision history.** Each board keeps its **20 previous snapshots**, reachable
from the `History` button. One caveat worth knowing: a new revision is only
opened once a minute. Without that throttle, autosave firing every 2 seconds
would burn all 20 slots in well under a minute and the history would only reach
back 40 seconds; with it, 20 revisions covers roughly the last 20 minutes of
work. Nothing is lost either way — the current state is always saved
immediately, the throttle only affects how far back the history reaches. Tune it
with `WHITEBOARD_REVISION_INTERVAL_MS` if you'd rather have finer or coarser
granularity.

Restoring is itself undoable: the state you were in gets filed as a revision
before the restore is applied, so a mis-click is recoverable.

## Exporting

The `Export` button renders the whole board twice — PNG at 2× pixel ratio and
SVG — and writes both to your export directory as `<board-name>.png` and
`<board-name>.svg`. The browser can't write to disk on its own, so the images
are handed to the local API, which does the writing.

## Templates

The template row on the new-board screen is read from `templates/*.json`. Drop a
new file in that directory and it appears in the picker; no code change, no
rebuild of anything but the page refresh. Each file looks like:

```json
{
  "id": "retro-grid",
  "name": "Retro grid",
  "description": "Shown under the name in the picker.",
  "order": 1,
  "shapes": [
    { "id": "col-1", "type": "geo", "x": 80, "y": 140,
      "props": { "geo": "rectangle", "w": 400, "h": 620, "color": "light-green" } },
    { "id": "col-1-label", "type": "text", "x": 104, "y": 164, "text": "Went well" }
  ]
}
```

`shapes` are tldraw shape partials applied with `editor.createShapes()`. Two
conveniences: `text` is shorthand for the rich-text prop so files stay readable,
and `id` is a plain string you can point a child's `parentId` at — shapes are
created parents-first so the reference resolves. A template is only applied to a
board that has never been saved, so a stale URL can't stamp a grid over real
work.

Shipped: `retro-grid`, `brainstorm-columns`, `weekly-plan`.

## Layout

```
whiteboard/
├─ server/
│  ├─ index.js       Express API + static hosting, loopback unless sharing
│  ├─ db.js          SQLite schema, snapshot saves, revision pruning
│  ├─ sync.js        Sync rooms, two-seat limit, server-side persistence
│  ├─ templates.js   Reads templates/*.json
│  └─ paths.js       Where the database and exports live
├─ src/
│  ├─ App.tsx        Hash router: #/ picker, #/b/<id> board
│  ├─ api.ts         Typed fetch wrappers
│  ├─ board/         Autosave, templates, export, thumbnails, assets
│  └─ components/    BoardPicker, BoardEditor, SoloCanvas, SharedCanvas, BoardPanel
├─ templates/        Template JSON, read at runtime
└─ scripts/          dev.mjs (API + Vite), share.mjs (sharing on)
```

## Notes

- **Offline.** tldraw fetches its fonts and icons from a CDN by default, which
  would leave the canvas broken without a network. They're bundled into the
  build instead (`@tldraw/assets`), so the app makes no external requests at all.
- **The tldraw watermark** in the bottom-right corner comes with the free SDK
  license. Removing it requires a commercial license from tldraw.
- **Sharing is off unless you ask for it.** `npm start` binds to loopback and
  never opens a WebSocket.

## Sharing with one other person

```bash
npm run share
```

That's the only difference: the server binds to your LAN address as well as
loopback, and opens a sync WebSocket. It prints the address to send the other
person, and the board picker shows it too. They open the same URL, click the
same board, and you're both on it — shapes, selections and cursors in real time,
built on `@tldraw/sync`.

**Boards seat two.** A third person gets turned away with "That board is full"
rather than silently joining. A seat frees up a few seconds after someone closes
their tab; reloading your own tab keeps your seat rather than locking you out of
your own board.

While sharing is on:

- **The server saves, not the browser.** The sync room owns the document, so it
  writes the snapshot to SQLite 2 seconds after the last change — the same
  rhythm as solo autosave, and into the same table, so revision history works
  exactly as it does alone. The browser only sends thumbnails, which are the one
  thing a server can't render.
- **Rolling back reaches both of you.** `History` goes through the server, which
  pushes the restored state into the live room. You won't end up looking at
  different boards.
- **Pasted images are written to disk** (`~/.whiteboard/assets/`) and served
  from the API, because the other person's browser has to be able to fetch them.
  Solo boards do the same, so a board is portable between the two modes.

**There is no authentication.** Anyone who can reach that port on your network
can open your boards and edit them. That is the tradeoff you're making when you
run `npm run share` instead of `npm start`, and it's why sharing isn't the
default — run it on a network you trust, and stop it when you're done.

## Out of scope, on purpose

No timers, no voting, no integrations, and no tuning for large multiplayer
boards. This is a thinking canvas, not a venue.
