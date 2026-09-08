import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'
import fs from 'fs' // 1. IMPORTANTE: Adicionado para ler os certificados

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate', 
      includeAssets: ['favicon.ico', 'logo.svg'], 
      manifest: {
        name: 'Sistema de Manutenção e Checklists',
        short_name: 'ChecklistApp',
        description: 'Aplicativo para preenchimento de checklists',
        theme_color: '#0284c7', 
        background_color: '#ffffff',
        display: 'standalone', 
        icons: [
          {
            src: 'logo.svg', 
            sizes: 'any',    
            type: 'image/svg+xml'
          }
        ]
      }
    })
  ],
  server: {
    host: '0.0.0.0', // 2. ESSENCIAL: Permite que dispositivos na rede local (como o tablet) acessem o frontend
    
    https: {         // 3. SSL: Aponta para os certificados que você acabou de gerar
      key: fs.readFileSync('./192.168.100.209+1-key.pem'),
      cert: fs.readFileSync('./192.168.100.209+1.pem'),
    },

    proxy: {
      '/api': {
        target: 'http://localhost:3000', 
        changeOrigin: true,
        secure: false, // 4. Evita que o Vite bloqueie a requisição entre o Front (HTTPS) e o Back (HTTP)
      },
      '/uploads': {
        target: 'http://127.0.0.1:3000', 
        changeOrigin: true,
        secure: false, 
      }
    }
  }
})