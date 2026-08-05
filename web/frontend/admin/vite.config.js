import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// Web 管理后台构建配置：/api 代理到本地后端 8080
export default defineConfig({
  plugins: [vue()],
  server: {
    port: 5174,
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true
      }
    }
  }
})
