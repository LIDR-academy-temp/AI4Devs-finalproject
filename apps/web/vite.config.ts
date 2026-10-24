import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'node:path';

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  // Lee también el .env de la raíz del monorepo (solo variables VITE_*)
  const env = loadEnv(mode, path.resolve(__dirname, '../..'), 'VITE_');
  const apiUrl = env.VITE_API_URL || 'http://localhost:3000';

  return {
    plugins: [react(), tailwindcss()],
    resolve: {
      alias: { '@': path.resolve(__dirname, './src') },
    },
    server: {
      port: Number(process.env.WEB_PORT) || 5173,
      strictPort: false,
      proxy: {
        // Las llamadas a /api se reenvían a la API para evitar CORS en desarrollo
        '/api': { target: apiUrl, changeOrigin: true },
      },
    },
  };
});
