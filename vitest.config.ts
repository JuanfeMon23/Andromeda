import { defineConfig } from 'vitest/config'

// Solo lógica pura (sin Nuxt): los tests de componentes y de composables que
// dependen de auto-imports o @nuxt/test-utils viven en cada app.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['app/{utils,composables}/**/*.test.ts'],
    exclude: ['app/composables/useZodForm.test.ts', 'app/composables/useDebouncedRef.test.ts']
  }
})
