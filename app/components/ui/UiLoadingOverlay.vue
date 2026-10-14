<script setup lang="ts">
/**
 * Velo de carga para un panel o tarjeta: atenúa el contenido y muestra un
 * spinner mientras `loading` es true. El contenedor padre debe ser `relative`
 * (o usar el propio componente como envoltorio con el slot por defecto).
 *
 * Con slot: `<UiLoadingOverlay :loading="busy">…contenido…</UiLoadingOverlay>`.
 */
withDefaults(
  defineProps<{
    loading: boolean
    label?: string
  }>(),
  { label: 'Cargando…' }
)
</script>

<template>
  <div class="relative" :aria-busy="loading">
    <div :class="loading ? 'pointer-events-none opacity-50 transition-opacity' : 'transition-opacity'">
      <slot />
    </div>
    <Transition
      enter-active-class="transition-opacity duration-150"
      enter-from-class="opacity-0"
      leave-active-class="transition-opacity duration-150"
      leave-to-class="opacity-0"
    >
      <div
        v-if="loading"
        class="absolute inset-0 flex items-center justify-center"
        role="status"
      >
        <UiSpinner size="lg" color="primary" :label="label" />
      </div>
    </Transition>
  </div>
</template>
