# Andromeda

Capa Nuxt con el sistema de diseño compartido. No se ejecuta por sí sola: la usan las aplicaciones.

## Usar

```ts
// nuxt.config.ts de la aplicación
export default defineNuxtConfig({
  extends: ['../../andromeda']
})
```

La aplicación debe tener instalados `nuxt`, `vue`, `vee-validate`, `@vee-validate/zod` y `zod`.

```bash
cd andromeda
pnpm install
```
