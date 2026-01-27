import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'path'

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
  ],
  build: {
    outDir: '../myapp/static/vue',
    emptyOutDir: true,
    rollupOptions: {
      input: path.resolve(__dirname, 'src/main.js'),
      output: {
        entryFileNames: 'assets/[name].js',
        chunkFileNames: 'assets/[name].js',
        assetFileNames: 'assets/[name].[ext]'
      }
    },
  },
  base: process.env.NODE_ENV === 'production' ? '/static/vue/' : '/',
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5173,
    cors: true,
    origin: 'http://localhost:5173'
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: `@use "${path.resolve(__dirname, '../myapp/static/scss/_variables.scss')}";`
      }
    }
  }
})
