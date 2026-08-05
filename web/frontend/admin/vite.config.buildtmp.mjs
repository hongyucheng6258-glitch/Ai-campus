import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

// 临时构建配置：禁用 emptyOutDir 以绕过环境 safe-delete 对 dist 路径的拦截。
// 仅用于本地编译校验，验证后删除。
export default defineConfig({
  plugins: [vue()],
  build: { emptyOutDir: false },
  server: {
    port: 5174,
    proxy: {
      '/api': { target: 'http://localhost:8080', changeOrigin: true }
    }
  }
})
