import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    headers: {
      'Cross-Origin-Embedder-Policy': 'require-corp',
      'Cross-Origin-Opener-Policy': 'same-origin',
      'Cross-Origin-Resource-Policy': 'same-origin',
    },
    proxy: {
      // Proxy API calls to the Express server
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Proxy PiKVM stream to the Express server
      '/pikvm-stream': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
      // Proxy FFmpeg library files to the Express server
      '/lib': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
});