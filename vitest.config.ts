import path from 'path'

import { defineConfig } from 'vitest/config'
import solid from 'vite-plugin-solid'

export default defineConfig({
  plugins: [solid()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./src/tests/setup.tsx'],
    include: ['src/tests/**/*.test.{ts,tsx}'],
    exclude: ['src/tests/visual/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/tests/**', '**/*.d.ts', 'src/index.tsx'],
      // TESTING.md §4: 80% overall, 90% for auth, the storage/data layer, and core
      // domain logic (character data transforms). `pnpm test:coverage` fails when any of
      // these is missed, and CI runs it as a required step (see .github/workflows/ci.yml).
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
        'src/lib/auth-context.tsx': { lines: 90, functions: 90, branches: 90, statements: 90 },
        'src/lib/firebase-storage.ts': { lines: 90, functions: 90, branches: 90, statements: 90 },
        'src/lib/storage-manager.ts': { lines: 90, functions: 90, branches: 90, statements: 90 },
        'src/lib/character-utils.ts': { lines: 90, functions: 90, branches: 90, statements: 90 },
        'src/lib/character-migrations.ts': { lines: 90, functions: 90, branches: 90, statements: 90 },
        'src/lib/character-import-reconciliation.ts': { lines: 90, functions: 90, branches: 90, statements: 90 },
      },
    },
  },
  resolve: {
    alias: { '@': path.resolve(__dirname, './src') },
  },
})
