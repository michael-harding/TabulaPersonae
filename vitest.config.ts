import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'
import path from 'path'

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.tsx'],
    include: ['src/tests/**/*.test.{ts,tsx}'],
    exclude: ['src/tests/visual/**'],
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
