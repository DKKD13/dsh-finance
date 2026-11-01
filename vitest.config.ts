import { defineConfig } from 'vitest/config'

export default defineConfig({
  esbuild: {
    jsx: 'automatic',
  },
  test: {
    include: ['tests/host/**/*.spec.ts', 'tests/client/**/*.spec.ts', 'tests/client/**/*.spec.tsx'],
    environment: 'node',
    testTimeout: 20000,
  },
})
