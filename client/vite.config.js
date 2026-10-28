import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:4100',
        changeOrigin: true,
        // Keep Server-Sent Events open for live admin notifications.
        timeout: 0,
        proxyTimeout: 0,
      },
    },
  },
});
