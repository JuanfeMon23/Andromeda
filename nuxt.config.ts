import { fileURLToPath } from 'node:url'
import tailwindcss from '@tailwindcss/vite'

/**
 * Andromeda: capa Nuxt con el sistema de diseño compartido (estilo HeroUI).
 * Las apps la usan con `extends`. Aporta componentes `Ui*`, tokens de Tailwind v4
 * (`main.css`) y los composables/utilidades genéricos de formularios.
 * Requiere que la app tenga instalados `vee-validate`, `@vee-validate/zod` y `zod`.
 */
export default defineNuxtConfig({
  css: [fileURLToPath(new URL('./app/assets/css/main.css', import.meta.url))],
  // Para imports expl�citos desde la app: `#andromeda/utils/search`.
  alias: { '#andromeda': fileURLToPath(new URL('./app', import.meta.url)) },
  vite: { plugins: [tailwindcss()] }
})
