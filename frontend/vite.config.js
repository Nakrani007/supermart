import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '');
  const backendUrl = env.VITE_API_URL || 'http://localhost:5000';

  return {
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // Proxy API calls in dev — avoids CORS setup during development
      '/api': {
        target: backendUrl,
        changeOrigin: true,
      },
      // Proxy Pollinations image requests — avoids CORS/Referer blocking in <img> tags
      '/pollinations-img': {
        target: 'https://image.pollinations.ai',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/pollinations-img/, ''),
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
  };
});
