import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
// The site deploys to `https://lui-osor.github.io/trip-splitter/`, so the
// production build must know that base path. Dev server keeps `/` so we can
// hit http://localhost:5173/ as usual.
export default defineConfig(({ command }) => ({
  plugins: [react(), tailwindcss()],
  base: command === 'build' ? '/trip-splitter/' : '/',
}))
