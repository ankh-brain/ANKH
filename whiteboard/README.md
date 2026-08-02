# Whiteboard

A personal thinking canvas that runs on your own machine. Built on the
[tldraw SDK](https://tldraw.dev) — shapes, sticky notes, connectors, freehand
drawing and selection all come from tldraw; this repo adds the parts tldraw
doesn't have opinions about: named boards, autosave to SQLite, revision history,
disk exports, and templates.

No accounts, no telemetry, no cloud. It binds to `127.0.0.1` and works with the
network unplugged.

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
| `npm start` | Serves `dist/` and the API together on 4900 |
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
│  ├─ index.js       Express API + static hosting, loopback only
│  ├─ db.js          SQLite schema, snapshot saves, revision pruning
│  ├─ templates.js   Reads templates/*.json
│  └─ paths.js       Where the database and exports live
├─ src/
│  ├─ App.tsx        Hash router: #/ picker, #/b/<id> board
│  ├─ api.ts         Typed fetch wrappers
│  ├─ board/         Autosave, template application, export, context
│  └─ components/    BoardPicker, BoardEditor, BoardPanel
├─ templates/        Template JSON, read at runtime
└─ scripts/dev.mjs   Runs the API and Vite together
```

## Notes

- **Offline.** tldraw fetches its fonts and icons from a CDN by default, which
  would leave the canvas broken without a network. They're bundled into the
  build instead (`@tldraw/assets`), so the app makes no external requests at all.
- **The tldraw watermark** in the bottom-right corner comes with the free SDK
  license. Removing it requires a commercial license from tldraw.
- **Sharing with one other person is not implemented.** See below.

## Not built: two-person sharing

The optional share-over-my-private-network mode was time-boxed to an hour and
skipped, because it isn't an hour's work. It needs a `@tldraw/sync-core`
`TLSocketRoom` behind a WebSocket server, a client switched over to `useSync`,
and — the actual cost — a rewrite of the save path: the sync room becomes the
owner of the document, so the debounced snapshot autosave and the revision
history both have to be re-plumbed through the room rather than the editor
store. It also means binding to `0.0.0.0` instead of loopback, which is a
deliberate change to the security posture of an app whose whole premise is that
it's local. Doing that halfway is worse than not doing it, so nothing here is
half-wired for it — it's a clean addition when you want it.

In the meantime, exporting a PNG and sending it covers most of what one would
have wanted it for.

## Out of scope, on purpose

No timers, no voting, no integrations, and no tuning for large multiplayer
boards. This is a thinking canvas, not a venue.
