import { createShapeId, toRichText, type Editor, type TLShapeId } from 'tldraw'
import type { Template, TemplateShape } from '../types'

/**
 * Turns a template JSON file into real shapes on the current page.
 *
 * Template files use plain string ids ("retro-col-1"); we map those through
 * createShapeId so a file can reference a parent frame without knowing tldraw's
 * id format. Shapes are created parents-first so `parentId` always resolves.
 */
export function applyTemplate(editor: Editor, template: Template) {
  const ids = new Map<string, TLShapeId>()
  for (const shape of template.shapes) {
    if (shape.id) ids.set(shape.id, createShapeId(shape.id))
  }

  const toPartial = (shape: TemplateShape) => {
    const props: Record<string, unknown> = { ...(shape.props ?? {}) }
    if (typeof shape.text === 'string' && shape.text.length > 0) {
      props.richText = toRichText(shape.text)
    }

    return {
      ...(shape.id ? { id: ids.get(shape.id) } : {}),
      type: shape.type,
      x: shape.x,
      y: shape.y,
      rotation: shape.rotation,
      ...(shape.parentId && ids.has(shape.parentId)
        ? { parentId: ids.get(shape.parentId) }
        : {}),
      ...(Object.keys(props).length > 0 ? { props } : {}),
    }
  }

  const roots = template.shapes.filter((shape) => !shape.parentId)
  const children = template.shapes.filter((shape) => shape.parentId)

  type ShapePartials = Parameters<Editor['createShapes']>[0]

  editor.run(() => {
    if (roots.length > 0) editor.createShapes(roots.map(toPartial) as ShapePartials)
    if (children.length > 0) editor.createShapes(children.map(toPartial) as ShapePartials)
    editor.selectNone()
    editor.zoomToFit()
  })
}
