import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// The FastAPI backend ships without CORS headers, so the dev server proxies
// /api and /health to it rather than the browser calling it cross-origin.
const BACKEND = process.env.VITE_API_TARGET || 'http://localhost:8000'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': { target: BACKEND, changeOrigin: true },
      '/health': { target: BACKEND, changeOrigin: true },
    },
  },
})
