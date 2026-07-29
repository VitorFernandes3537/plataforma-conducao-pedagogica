import { fileURLToPath } from 'node:url'

import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    include: ['tests/**/*.test.ts'],
    // Banco por arquivo de teste. PGlite roda em processo, então isolar por
    // fork evita que dois arquivos compartilhem estado do mesmo Postgres.
    pool: 'forks',
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
})
