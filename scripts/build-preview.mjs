/**
 * Flattens the Vite build into one self-contained HTML file that can be opened
 * straight off disk (file://) with no server. Inlines the JS and CSS assets so
 * the preview always matches the built source.
 *
 * Usage: npm run build && node scripts/build-preview.mjs
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = resolve(root, 'dist')
const out = resolve(root, 'preview/axon-hero-preview.html')

let html = readFileSync(resolve(dist, 'index.html'), 'utf8')

// Inline <script type="module" src="/assets/x.js"></script>
html = html.replace(
  /<script[^>]*src="\/([^"]+)"[^>]*><\/script>/g,
  (_, src) =>
    `<script type="module">\n${readFileSync(resolve(dist, src), 'utf8')}\n</script>`,
)

// Inline <link rel="stylesheet" href="/assets/x.css">
html = html.replace(
  /<link[^>]*rel="stylesheet"[^>]*href="\/([^"]+)"[^>]*>/g,
  (_, href) => `<style>\n${readFileSync(resolve(dist, href), 'utf8')}\n</style>`,
)

mkdirSync(dirname(out), { recursive: true })
writeFileSync(out, html)
console.log(`preview → ${out} (${(html.length / 1024).toFixed(0)}KB)`)
