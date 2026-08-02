import type { Editor } from 'tldraw'
import { api } from '../api'
import { makeThumbnail } from './thumbnail'

/**
 * On a shared board the snapshot is saved by the server, straight out of the
 * sync room — but only a browser can render a thumbnail, so the client keeps
 * sending those. Slower than the autosave debounce because a thumbnail being a
 * few seconds stale costs nothing.
 */
const THUMBNAIL_DELAY_MS = 5000

export function attachThumbnailSaver(editor: Editor, boardId: string) {
  let timer: ReturnType<typeof setTimeout> | null = null
  let disposed = false

  const write = async () => {
    timer = null
    const thumbnail = await makeThumbnail(editor)
    if (!thumbnail || disposed) return
    try {
      await api.saveThumbnail(boardId, thumbnail)
    } catch (error) {
      console.warn('[whiteboard] thumbnail save failed', error)
    }
  }

  const schedule = () => {
    if (disposed || timer) return
    timer = setTimeout(write, THUMBNAIL_DELAY_MS)
  }

  const unlisten = editor.store.listen(schedule, { source: 'user', scope: 'document' })

  return () => {
    disposed = true
    unlisten()
    if (timer) clearTimeout(timer)
  }
}
