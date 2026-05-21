import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls in dev — avoids CORS setup during development
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
    },
  },
  build: {
    // Split vendor chunks for better caching — recharts is large, isolate it
    rollupOptions: {
      output: {
        manualChunks: {
          react: ['react', 'react-dom', 'react-router-dom'],
          charts: ['recharts'],
          state: ['zustand'],
        },
      },
    },
    // Warn when any chunk exceeds 400KB — keep bundle lean for 2G users
    chunkSizeWarningLimit: 400,
  },
});
