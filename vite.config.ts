import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { readFileSync } from 'node:fs'

const version = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf8')).version

export default defineConfig({
  plugins: [vue()],
  base: process.env.GITHUB_PAGES === '1' ? '/KeyBoardTestUtility/' : './',
  define: { __APP_VERSION__: JSON.stringify(version) },
  server: { port: 1420, strictPort: true, host: '127.0.0.1', watch: { ignored: ['**/src-tauri/target/**', '**/artifacts/**', '**/.vs/**', '**/bin/**', '**/obj/**'] } },
  build: { target: 'es2022' },
})
