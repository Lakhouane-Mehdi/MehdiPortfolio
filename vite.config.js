import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  build: {
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        screenshots: resolve(__dirname, 'screenshots.html'),
        admin: resolve(__dirname, 'admin.html'),
        impressum: resolve(__dirname, 'impressum.html'),
        datenschutz: resolve(__dirname, 'datenschutz.html'),
        notfound: resolve(__dirname, '404.html'),
      }
    }
  }
})
