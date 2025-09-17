// vite.config.ts
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import mkcert from 'vite-plugin-mkcert'

const LAN_IP = '192.168.254.188' // your PC's IP (update if it changes)

export default defineConfig({
  plugins: [react(), mkcert({ hosts: ['localhost', '127.0.0.1', LAN_IP] })],
  server: {
    host: LAN_IP,        // bind to a single LAN address (not 0.0.0.0)
    https: true,
    strictPort: true,
    // helps HMR connect correctly from phones
    hmr: { host: LAN_IP, protocol: 'wss' },
    // optional: restrict Host header
    // allowedHosts: [LAN_IP],
    // optional: narrow CORS to your own origin if you fetch from other tabs
    // cors: { origin: `https://${LAN_IP}:5173` }
  }
})
