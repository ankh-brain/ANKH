import { getSnapshot, type Editor } from 'tldraw'
import { api, saveSnapshotBeacon } from '../api'

/** Debounce window: we save 2 seconds after the last change. */
export const AUTOSAVE_DELAY_MS = 2000

/** Thumbnails are for the board picker, so they only need to be card-sized. */
const THUMBNAIL_MAX_PX = 400

export type SaveState = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

async function makeThumbnail(editor: Editor): Promise<string | null> {
  const shapeIds = [...editor.getCurrentPageShapeIds()]
  if (shapeIds.length === 0) return null

  const bounds = editor.getCurrentPageBounds()
  if (!bounds) return null

  // Scale so the long edge lands near THUMBNAIL_MAX_PX rather than exporting a
  // full-resolution image of the whole board on every autosave.
  const scale = Math.min(1, THUMBNAIL_MAX_PX / Math.max(bounds.width, bounds.height))

  try {
    const result = await editor.toImageDataUrl(shapeIds, {
      format: 'png',
      background: true,
      padding: 16,
      scale,
      pixelRatio: 1,
      darkMode: false,
    })
    return result?.url ?? null
  } catch (error) {
    console.warn('[whiteboard] thumbnail failed', error)
    return null
  }
}

/**
 * Wires debounced autosave onto an editor. Returns a disposer plus a `flush`
 * for the cases where we cannot wait out the debounce (leaving the board,
 * hiding the tab, exporting).
 */
export function attachAutosave(
  editor: Editor,
  boardId: string,
  onStateChange: (state: SaveState) => void
) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let dirty = false
  let inFlight: Promise<void> = Promise.resolve()
  let disposed = false

  const write = async () => {
    if (!dirty) return
    dirty = false
    onStateChange('saving')

    const snapshot = getSnapshot(editor.store)
    const thumbnail = await makeThumbnail(editor)

    try {
      await api.saveSnapshot(boardId, snapshot, thumbnail)
      onStateChange(dirty ? 'pending' : 'saved')
    } catch (error) {
      console.error('[whiteboard] autosave failed', error)
      dirty = true // keep the change queued so the next tick retries
      onStateChange('error')
    }
  }

  const schedule = () => {
    if (disposed) return
    dirty = true
    onStateChange('pending')
    if (timer) clearTimeout(timer)
    timer = setTimeout(() => {
      timer = null
      inFlight = inFlight.then(write)
    }, AUTOSAVE_DELAY_MS)
  }

  const flush = async () => {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }
    inFlight = inFlight.then(write)
    await inFlight
  }

  // Only content changes start the clock — otherwise merely panning the camera
  // would keep the board permanently dirty. The snapshot we write still carries
  // the camera along, so the viewport is restored when you come back.
  const unlisten = editor.store.listen(schedule, { source: 'user', scope: 'document' })

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') void flush()
  }

  const onPageHide = () => {
    if (!dirty) return
    saveSnapshotBeacon(boardId, getSnapshot(editor.store), null)
  }

  document.addEventListener('visibilitychange', onVisibilityChange)
  window.addEventListener('pagehide', onPageHide)

  return {
    flush,
    /** Marks the store dirty without waiting for a user edit (used after a restore). */
    touch: schedule,
    dispose: () => {
      disposed = true
      unlisten()
      document.removeEventListener('visibilitychange', onVisibilityChange)
      window.removeEventListener('pagehide', onPageHide)
      if (timer) {
        clearTimeout(timer)
        timer = null
      }
      // Fire a final save for anything still queued. Deliberately not awaited —
      // React unmount is synchronous.
      if (dirty) void write()
    },
  }
}
