import type { Editor } from 'tldraw'

/** Thumbnails are for the board picker, so they only need to be card-sized. */
const THUMBNAIL_MAX_PX = 400

/**
 * Renders a small PNG of the whole page. Returns null for an empty board, or if
 * the export fails — a missing thumbnail is never worth failing a save over.
 */
export async function makeThumbnail(editor: Editor): Promise<string | null> {
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
