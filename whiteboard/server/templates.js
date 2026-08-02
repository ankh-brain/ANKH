import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const TEMPLATE_DIR = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '..',
  'templates'
)

/**
 * Templates are plain JSON in templates/ — drop a new file in that directory and
 * it shows up on the new-board screen with no code change. Each file is:
 *
 *   { "id", "name", "description", "shapes": [ { "id"?, "type", "x", "y",
 *     "parentId"?, "text"?, "props"? } ] }
 *
 * The shapes are tldraw shape partials, applied by the browser via
 * editor.createShapes(). "text" is sugar for props.richText so the files stay
 * readable by hand.
 */
export function listTemplates() {
  if (!fs.existsSync(TEMPLATE_DIR)) return []

  return fs
    .readdirSync(TEMPLATE_DIR)
    .filter((file) => file.endsWith('.json'))
    .map((file) => {
      const full = path.join(TEMPLATE_DIR, file)
      try {
        const template = JSON.parse(fs.readFileSync(full, 'utf8'))
        return { ...template, id: template.id || path.basename(file, '.json') }
      } catch (error) {
        console.warn(`[whiteboard] skipping malformed template ${file}: ${error.message}`)
        return null
      }
    })
    .filter(Boolean)
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0) || a.name.localeCompare(b.name))
}

export function getTemplate(id) {
  return listTemplates().find((template) => template.id === id) ?? null
}
