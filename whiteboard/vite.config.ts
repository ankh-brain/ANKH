import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** The API server dev.mjs starts alongside Vite. */
const API_PORT = Number(process.env.WHITEBOARD_API_PORT || 4901)

export default defineConfig({
  plugins: [react()],
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
    outDir: 'dist',
    // tldraw is a big dependency and this only ever runs from localhost.
    chunkSizeWarningLimit: 4000,
  },
})
