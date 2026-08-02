import os from 'node:os'
import path from 'node:path'
import fs from 'node:fs'

/**
 * Where the whiteboard keeps its state. Both locations can be overridden with
 * env vars, which is mostly useful for running a throwaway copy during dev.
 *
 *   WHITEBOARD_DATA_DIR   the SQLite database (default ~/.whiteboard)
 *   WHITEBOARD_EXPORT_DIR PNG/SVG exports    (default ~/Whiteboards)
 */
export const DATA_DIR =
  process.env.WHITEBOARD_DATA_DIR || path.join(os.homedir(), '.whiteboard')

export const EXPORT_DIR =
  process.env.WHITEBOARD_EXPORT_DIR || path.join(os.homedir(), 'Whiteboards')

export const DB_PATH = path.join(DATA_DIR, 'boards.db')

export function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true })
  return dir
}
