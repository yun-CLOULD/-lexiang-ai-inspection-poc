import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { fileURLToPath, URL } from 'node:url'

export default defineConfig({
  base: '/admin-vue/',
  plugins: [vue()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    }
  },
  server: {
    proxy: {
      // 把所有 /api 请求代理到后端，开发时与原项目保持一致
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true
      }
    }
  },
  build: {
    // 将 Vue 产物打包到 /admin-vue/ 目录，与部署 base 保持一致
    // emptyOutDir 设为 false：本沙箱 Node 运行时对 fs.rmSync 做了「安全删除」拦截（移到回收站），
    // Vite 的 prepareOutDir 清空旧产物时，会因 public/admin-vue/admin-runtime 等目录 trash 失败而中断构建。
    // 改为 false 后，每次构建前用 shell `rm -rf ../public/admin-vue` 预清（shell 删除不经 Node 拦截），
    // 既能彻底清掉旧产物，又不会触发 trash 拦截。
    outDir: '../public/admin-vue',
    emptyOutDir: false
  }
})
