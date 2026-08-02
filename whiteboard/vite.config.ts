import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import type { Plugin } from 'vite'

/** The API server dev.mjs starts alongside Vite. */
const API_PORT = Number(process.env.WHITEBOARD_API_PORT || 4901)

/**
 * The single-file preview build swaps the API for a localStorage stand-in and
 * inlines every asset, so the whole app can be opened from one HTML file with
 * no server behind it. See scripts/build-preview.mjs.
 */
const PREVIEW = process.env.VITE_PREVIEW === '1'
const resolveSrc = (file: string) => fileURLToPath(new URL(`./src/${file}`, import.meta.url))

/**
 * Redirects every import of src/api.ts to src/previewApi.ts. This has to happen
 * after resolution rather than through `resolve.alias`, because callers import
 * it as '../api' — an alias matches the specifier, not the file it lands on.
 */
function swapApiForPreview(): Plugin {
  return {
    name: 'whiteboard:preview-api',
    enforce: 'pre',
    async resolveId(source, importer, options) {
      if (source.includes('previewApi')) return null
      const resolved = await this.resolve(source, importer, { ...options, skipSelf: true })
      return resolved?.id === resolveSrc('api.ts') ? resolveSrc('previewApi.ts') : null
    },
  }
}

export default defineConfig({
  plugins: PREVIEW ? [react(), swapApiForPreview()] : [react()],
  server: {
    host: '127.0.0.1',
    port: 4900,
    strictPort: true,
    proxy: {
      '/api': {
        target: `http://127.0.0.1:${API_PORT}`,
        changeOrigin: false,
      },
    },
  },
  optimizeDeps: {
    // The asset manifest imports files with Vite's `?url` suffix, which the
    // dependency pre-bundler doesn't understand. Let Vite handle it directly.
    exclude: ['@tldraw/assets'],
  },
  build: {
    outDir: PREVIEW ? 'dist-preview' : 'dist',
    // tldraw is a big dependency and this only ever runs from localhost.
    chunkSizeWarningLimit: 4000,
    // In the preview build fonts and icons become data URIs, so the flattened
    // HTML has nothing left to fetch.
    assetsInlineLimit: PREVIEW ? 100 * 1024 * 1024 : undefined,
    cssCodeSplit: PREVIEW ? false : undefined,
  },
})
