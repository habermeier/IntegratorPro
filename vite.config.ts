import path from 'path';
import { defineConfig, loadEnv } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    server: {
      host: true, // Listen on all addresses
      port: 3002, // Avoid 3000/3001 conflicts
      strictPort: false, // Fallback if 3002 is taken
      watch: {
        // Use native inotify on Linux (much faster than polling)
        usePolling: false,
        // Ignore non-source directories to reduce file watching overhead
        ignored: [
          '**/node_modules/**',
          '**/dist/**',
          '**/tmp/**',
          '**/.git/**',
          '**/*.cpuprofile',
          '**/vite-profile-*.cpuprofile'
        ]
      },
      proxy: {
        '/api': {
          target: 'http://localhost:3001',
          changeOrigin: true,
          secure: false,
        },
      },
    },
    plugins: [react()],
    define: {
      'process.env.API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY)
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      }
    },
    build: {
      target: 'es2015',
      outDir: 'dist',
    }
  };
});
