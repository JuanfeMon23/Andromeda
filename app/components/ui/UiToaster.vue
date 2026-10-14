<script setup lang="ts">
/**
 * Contenedor de notificaciones. Se monta una sola vez (app.vue) y muestra lo
 * que se emite con `useToast()` (éxito, error, aviso, información).
 * Es una región `aria-live`: los lectores de pantalla anuncian cada aviso.
 */
const { toasts, dismiss } = useToast()
</script>

<template>
  <Teleport to="body">
    <div
      class="pointer-events-none fixed inset-x-0 top-4 z-[60] flex flex-col items-center gap-2 px-4 sm:inset-x-auto sm:right-4 sm:items-end"
      aria-live="polite"
      aria-atomic="false"
    >
      <TransitionGroup
        enter-active-class="transition duration-200 ease-out"
        enter-from-class="translate-y-2 opacity-0"
        leave-active-class="transition duration-150 ease-in"
        leave-to-class="opacity-0"
      >
        <div
          v-for="toast in toasts"
          :key="toast.id"
          class="pointer-events-auto flex w-full max-w-sm items-start gap-2 rounded-lg shadow-md"
        >
          <UiAlert
            class="w-full"
            :variant="toast.variant"
            :title="toast.title"
            :message="toast.message"
          />
          <button
            type="button"
            class="-ml-9 mt-2 h-6 w-6 shrink-0 rounded-sm text-current opacity-60 transition-opacity hover:opacity-100 focus-visible:outline-2 focus-visible:outline-primary-500"
            aria-label="Cerrar notificación"
            @click="dismiss(toast.id)"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>
      </TransitionGroup>
    </div>
  </Teleport>
</template>
