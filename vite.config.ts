
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  define: {
    'process.env.API_KEY': JSON.stringify(process.env.API_KEY || ''),
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'development')
  },
  server: {
    port: 5633, // 前端开发端口
    host: '0.0.0.0',
    strictPort: true,
    proxy: {
      // 开发环境将 API 请求转发到后端服务器
      '/api': {
        target: 'http://localhost:5634',
        changeOrigin: true,
        secure: false
      },
      // 转发附件图片的访问请求
      '/uploads': {
        target: 'http://localhost:5634',
        changeOrigin: true,
        secure: false
      }
    }
  },
  build: {
    target: 'esnext',
    outDir: 'dist',
    emptyOutDir: true
  }
});
