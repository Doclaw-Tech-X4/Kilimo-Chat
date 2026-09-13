import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import os from 'os'

const isPrivateLanAddress = (address) =>
  address.startsWith('192.168.') ||
  address.startsWith('10.') ||
  /^172\.(1[6-9]|2\d|3[0-1])\./.test(address)

function getLanIP() {
  const ifaces = os.networkInterfaces()
  for (const name of Object.keys(ifaces)) {
    for (const iface of ifaces[name] || []) {
      if (iface.family === 'IPv4' && !iface.internal && isPrivateLanAddress(iface.address)) {
        return iface.address
      }
    }
  }
  return '192.168.1.100'
}

export default defineConfig(({ mode }) => {
  const env = Object.assign({}, process.env, loadEnv(mode, process.cwd(), ''))
  const lanIP = getLanIP()
  const apiUrl = env.VITE_API_URL || `http://${lanIP}:8000`

  return {
    plugins: [react()],
    server: {
      host: true,
      port: 3000,
      strictPort: false,
    },
    build: {
      outDir: 'dist',
      sourcemap: false,
      chunkSizeWarningLimit: 1200,
    },
    define: {
      __API_URL__: JSON.stringify(apiUrl),
    },
  }
})