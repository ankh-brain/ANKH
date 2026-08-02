import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Starts the app with sharing switched on: the server binds to your LAN address
 * as well as loopback, and opens the sync WebSocket so one other person can
 * join a board. `npm start` does neither.
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

const child = spawn(process.execPath, ['server/index.js'], {
  cwd: ROOT,
  stdio: 'inherit',
  env: { ...process.env, WHITEBOARD_SHARE: '1' },
})

child.on('exit', (code) => process.exit(code ?? 0))
process.on('SIGINT', () => child.kill('SIGINT'))
process.on('SIGTERM', () => child.kill('SIGTERM'))
