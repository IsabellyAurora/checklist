import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    proxy: {
      // Toda requisição que começar com /api será redirecionada para o backend
      '/api': {
        target: 'http://localhost:3000', // Troque pela porta que o backend estiver rodando
        changeOrigin: true,
      },
      // NOVO: Proxy para as fotos
      '/uploads': {
        target: 'http://127.0.0.1:3000', // A mesma porta do seu backend
        changeOrigin: true,
      }
    }
  }
})