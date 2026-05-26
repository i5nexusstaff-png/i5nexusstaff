import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],

  build: {
    // Raise the chunk-size warning threshold slightly — recharts alone is ~400 kB
    chunkSizeWarningLimit: 600,
    rollupOptions: {
      output: {
        manualChunks: {
          // React core — changes rarely, benefits from long-term caching
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          // Charting library — largest single dep; isolate so app bundle stays small
          'vendor-charts': ['recharts'],
          // Lucide icons tree-shake well but the full set is large; separate chunk
          'vendor-icons': ['lucide-react'],
          // Auth / HTTP utilities
          'vendor-axios': ['axios'],
          // Google Maps is loaded via dynamic script tag — no bundle entry needed
        },
      },
    },
  },

  server: {
    // Proxy API calls in dev so you can set VITE_API_URL=/api and avoid CORS issues
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
      '/media': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})
