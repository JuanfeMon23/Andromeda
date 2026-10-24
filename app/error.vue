<script setup lang="ts">
import type { NuxtError } from '#app'

// Página de error por defecto de la capa Andromeda. Una app la sobrescribe
// creando su propio `app/error.vue`.
defineProps<{ error: NuxtError }>()
</script>

<template>
  <UiErrorPage :error="error" debug />
</template>
