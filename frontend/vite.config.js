import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      // Atualiza automaticamente o app no celular do manutentor quando você lança versão nova
      registerType: 'autoUpdate', 
      
      // Apenas o essencial para Android/Chrome
      includeAssets: ['favicon.ico', 'logo.svg'], 
      
      manifest: {
        name: 'Sistema de Manutenção e Checklists',
        short_name: 'ChecklistApp',
        description: 'Aplicativo para preenchimento de checklists',
        theme_color: '#0284c7', 
        background_color: '#ffffff',
        display: 'standalone', // Faz abrir em tela cheia (estilo aplicativo)
        icons: [
          {
            src: 'logo.svg', // O seu arquivo SVG que deve estar na pasta public
            sizes: 'any',    // O Android entende que o SVG se adapta sozinho
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      // Toda requisição que começar com /api será redirecionada para o backend
      '/api': {
        target: 'http://localhost:3000', // Troque pela porta que o backend estiver rodando
        changeOrigin: true,
      },
      // Proxy para as fotos
      '/uploads': {
        target: 'http://127.0.0.1:3000', // A mesma porta do seu backend
        changeOrigin: true,
      }
    }
  }
})