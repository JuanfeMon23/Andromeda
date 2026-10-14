import { defineConfig } from 'vitest/config'

// Solo lógica pura (sin Nuxt): los tests de componentes viven en cada app.
export default defineConfig({
  test: { environment: 'node', include: ['app/utils/**/*.test.ts'] }
})
