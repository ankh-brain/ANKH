import type { Editor } from 'tldraw'
import { api } from '../api'

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}

/**
 * Renders the whole board to PNG and SVG and hands both to the server, which
 * writes them next to each other in the exports directory (~/Whiteboards by
 * default). The browser can't write to disk itself, so the round trip is the
 * point.
 */
export async function exportBoard(editor: Editor, boardId: string) {
  const shapeIds = [...editor.getCurrentPageShapeIds()]
  if (shapeIds.length === 0) {
    throw new Error('This board is empty — nothing to export.')
  }

  const [image, svg] = await Promise.all([
    editor.toImage(shapeIds, {
      format: 'png',
      background: true,
      padding: 32,
      pixelRatio: 2,
      darkMode: false,
    }),
    editor.getSvgString(shapeIds, {
      background: true,
      padding: 32,
      darkMode: false,
    }),
  ])

  return api.exportBoard(boardId, {
    png: image?.blob ? await blobToDataUrl(image.blob) : undefined,
    svg: svg?.svg,
  })
}
