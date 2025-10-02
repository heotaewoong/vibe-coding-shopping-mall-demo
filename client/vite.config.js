import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5174,
    proxy: {
      // Proxy API requests to backend running on port 5001
      '/users': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      },
      '/items': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      },
      '/orders': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      },
      '/cart': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      },
      '/auth': {
        target: 'http://localhost:5001',
        changeOrigin: true,
        secure: false
      }
    }
  }
})
