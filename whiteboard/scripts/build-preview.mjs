/**
 * Flattens the preview build into one self-contained HTML file that runs with
 * no server: the API is swapped for a localStorage stand-in (src/previewApi.ts)
 * and every font and icon is already a data URI, so nothing is fetched.
 *
 * It's for clicking around the UI on a machine that isn't running the app. The
 * real thing saves to SQLite, exports to disk, and can be shared — none of
 * which a lone HTML file can do.
 *
 * Usage: npm run preview:build
 */
import { spawnSync } from 'node:child_process'
import { readFileSync, writeFileSync, mkdirSync, readdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist-preview')
const out = resolve(root, 'preview/whiteboard-preview.html')

const build = spawnSync(
  process.execPath,
  [resolve(root, 'node_modules', 'vite', 'bin', 'vite.js'), 'build'],
  { cwd: root, stdio: 'inherit', env: { ...process.env, VITE_PREVIEW: '1' } }
)
if (build.status !== 0) process.exit(build.status ?? 1)

// Guard against the API swap silently not happening: without it the preview
// would load, show no templates, and quietly fail every save.
const bundle = readdirSync(resolve(dist, 'assets'))
  .filter((file) => file.endsWith('.js'))
  .map((file) => readFileSync(resolve(dist, 'assets', file), 'utf8'))
  .join('')

if (!bundle.includes('whiteboard-preview-v1')) {
  console.error('\nThe preview API was not swapped in — the build still talks to a server.')
  process.exit(1)
}
if (bundle.includes('/api/boards')) {
  console.error('\nThe bundle still contains server API calls; the swap is incomplete.')
  process.exit(1)
}

let html = readFileSync(resolve(dist, 'index.html'), 'utf8')

html = html.replace(
  /<script[^>]*src="\/([^"]+)"[^>]*><\/script>/g,
  (_, src) => `<script type="module">\n${readFileSync(resolve(dist, src), 'utf8')}\n</script>`
)

html = html.replace(
  /<link[^>]*rel="stylesheet"[^>]*href="\/([^"]+)"[^>]*>/g,
  (_, href) => `<style>\n${readFileSync(resolve(dist, href), 'utf8')}\n</style>`
)

// Anything still pointing at /assets means a file didn't get inlined, and the
// preview would silently break wherever it's opened from.
const leftovers = html.match(/["'(]\/assets\/[^"')]+/g)
if (leftovers) {
  console.error(`\nNot self-contained — ${leftovers.length} asset reference(s) remain:`)
  console.error([...new Set(leftovers)].slice(0, 10).join('\n'))
  console.error(`\nEmitted files: ${readdirSync(resolve(dist, 'assets')).join(', ')}`)
  process.exit(1)
}

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, html)
console.log(`\npreview → ${out} (${(html.length / 1024 / 1024).toFixed(1)}MB)`)
