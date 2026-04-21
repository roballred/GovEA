import { defineConfig } from 'vitest/config'
import path from 'node:path'

export default defineConfig({
  resolve: {
    alias: { '@': path.resolve(__dirname, 'src') },
  },
  test: {
    environment: 'node',
    globals: true,
    setupFiles: ['./tests/integration/setup.ts'],
    include: ['tests/**/*.test.ts'],
    testTimeout: 15_000,
    // Serialize across files: tests share the dev DB and factories use unique orgs
    // for isolation, but serial execution avoids any cross-file race conditions.
    pool: 'forks',
    poolOptions: { forks: { singleFork: true } },
  },
})
