import { spawn } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

/**
 * Dev runs two processes: the API on 4901 and Vite on 4900. Vite proxies /api
 * across, so the app is at http://localhost:4900 in dev and in production alike
 * (in production the API server serves the built files itself on 4900).
 */
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const API_PORT = process.env.WHITEBOARD_API_PORT || '4901'

const children = []

function run(label, command, args, env) {
  const child = spawn(command, args, {
    cwd: ROOT,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: { ...process.env, ...env },
  })

  child.on('exit', (code, signal) => {
    if (shuttingDown) return
    console.error(`[whiteboard] ${label} exited (${signal ?? code}) — stopping dev`)
    shutdown(code ?? 1)
  })

  children.push(child)
  return child
}

let shuttingDown = false
function shutdown(code = 0) {
  if (shuttingDown) return
  shuttingDown = true
  for (const child of children) child.kill('SIGTERM')
  process.exit(code)
}

process.on('SIGINT', () => shutdown(0))
process.on('SIGTERM', () => shutdown(0))

run('api', process.execPath, ['server/index.js'], { PORT: API_PORT })
run('vite', process.execPath, [path.join(ROOT, 'node_modules', 'vite', 'bin', 'vite.js')], {
  WHITEBOARD_API_PORT: API_PORT,
})
