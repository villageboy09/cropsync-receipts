import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: ['html2canvas', 'jspdf'], // ✅ treat as external modules
    },
  },
  optimizeDeps: {
    include: ['html2canvas', 'jspdf'], // ✅ pre-bundle these
  },
})
