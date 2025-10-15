// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

const LAN_IP = '192.168.254.188' // ✅ match backend

export default defineConfig({
  plugins: [react(), mkcert({ hosts: ['localhost', LAN_IP] })],
  server: {
    host: LAN_IP,
    https: {
      key: './localhost+1-key.pem',
      cert: './localhost+1.pem',
    },
    strictPort: true,
    hmr: { host: LAN_IP, protocol: 'wss' },
  },
})
