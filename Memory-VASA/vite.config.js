import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    allowedHosts: [
      '.replit.dev',  // Allows all Replit dev hosts
      '03039db7-6b88-418e-a4ef-94a6f86c625f-00-1urmx6gyz0mtn.worf.replit.dev'
    ],
    proxy: {
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
        secure: false
      }
    }
  }
})