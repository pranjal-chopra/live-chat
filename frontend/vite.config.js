import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      // any request to /api/* gets forwarded to Flask on 5000
      '/api': {
        target: 'http://localhost:5000',
        changeOrigin: true,
      },
      // websocket proxy
      '/socket.io': {
        target: 'http://localhost:5000',
        ws: true,
        changeOrigin: true,
      }
    }
  }
})
