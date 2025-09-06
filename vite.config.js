import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

export default defineConfig({
  plugins: [vue()],
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  clearScreen: false,
  server: {
    port: 5174,
    strictPort: true,
    watch: {
      ignored: ["**/src-tauri/**"]
    }
  },
  define: {
    __TAURI_PLATFORM__: JSON.stringify(process.env.TAURI_PLATFORM)
  },
  optimizeDeps: {
    exclude: ['@tauri-apps/api']
  }
})
