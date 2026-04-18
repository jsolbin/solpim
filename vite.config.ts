import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { URL, fileURLToPath } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  plugins: [react(), tailwindcss()],
})
