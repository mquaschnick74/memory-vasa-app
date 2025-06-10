// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: (id) => {
        // Exclude all server-side modules
        if (id.includes('/server/') || id.includes('\\server\\')) {
          return true;
        }
        // Exclude Node.js built-in modules
        const nodeModules = [
          'express', 'cors', 'dotenv', 'path', 'fs', 'http', 'https', 
          'net', 'events', 'util', 'stream', 'buffer', 'querystring', 
          'url', 'crypto', 'os', 'child_process', 'cluster', 'dgram',
          'dns', 'domain', 'readline', 'repl', 'tls', 'tty', 'vm',
          'worker_threads', 'zlib'
        ];
        return nodeModules.includes(id);
      }
    },
    target: 'es2015',
    sourcemap: false
  },
  resolve: {
    alias: {
      // Prevent importing server directories
      '@/server': false,
      './server': false,
      '../server': false,
      '../../server': false
    }
  },
  define: {
    global: 'globalThis',
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production')
  },
  optimizeDeps: {
    exclude: ['firebase-admin'] // Exclude server-side Firebase
  }
})
