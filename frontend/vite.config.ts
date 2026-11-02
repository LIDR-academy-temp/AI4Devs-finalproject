import react from '@vitejs/plugin-react'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  plugins: [react()],
  server: {
    // En desarrollo, la API llega por el proxy de Docker Compose.
    proxy: { '/api': 'http://127.0.0.1:8080' },
  },
  test: {
    environment: 'jsdom',
    // e2e/ corre con Playwright, contra la pila completa.
    include: ['src/**/*.test.{ts,tsx}'],
    setupFiles: './src/pruebas/preparacion.ts',
  },
})
