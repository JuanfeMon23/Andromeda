<script setup lang="ts">
/**
 * Página de error reutilizable. Muestra textos fijos según `error.statusCode`
 * (ver `errorView`); NUNCA el mensaje crudo del servidor ni el stack, salvo
 * con `debug` (y solo en desarrollo). Pensada para `app/error.vue`.
 */
import { errorView } from '../../utils/errorView'

interface ErrorLike {
  statusCode?: number | string
  statusMessage?: string
  message?: string
}

const props = withDefaults(
  defineProps<{
    error?: ErrorLike | null
    homeTo?: string
    homeLabel?: string
    showBack?: boolean
    /** Muestra el detalle técnico; ignorado fuera de desarrollo. */
    debug?: boolean
  }>(),
  { error: null, homeTo: '/', homeLabel: 'Volver al inicio', showBack: true, debug: false }
)

const view = computed(() => errorView(props.error?.statusCode))
const code = computed(() => {
  const n = Number(props.error?.statusCode)
  return Number.isInteger(n) && n >= 400 && n < 600 ? n : null
})
// 5xx/inesperados interrumpen (alert); 4xx esperados informan (status).
const isServer = computed(() => code.value === null || code.value >= 500)
const showDebug = computed(() => props.debug && import.meta.dev)
const detail = computed(() =>
  [props.error?.statusMessage, props.error?.message].filter(Boolean).join(' · ')
)

const titleEl = ref<HTMLElement | null>(null)
onMounted(() => titleEl.value?.focus())

const goHome = () => clearError({ redirect: props.homeTo })
const reload = () => reloadNuxtApp()
const goBack = () => {
  if (import.meta.client && window.history.length > 1) window.history.back()
  else goHome()
}
const primaryIsHome = computed(() => view.value.primaryAction.kind === 'home')
const primaryLabel = computed(() =>
  primaryIsHome.value && view.value.primaryAction.label === 'Volver al inicio'
    ? props.homeLabel
    : view.value.primaryAction.label
)
const onPrimary = () => (primaryIsHome.value ? goHome() : reload())

const paths: Record<string, string> = {
  search: 'M21 21l-4.3-4.3M10.5 18a7.5 7.5 0 100-15 7.5 7.5 0 000 15z',
  lock: 'M7 11V8a5 5 0 0110 0v3M6 11h12a1 1 0 011 1v8a1 1 0 01-1 1H6a1 1 0 01-1-1v-8a1 1 0 011-1z',
  ban: 'M12 21a9 9 0 100-18 9 9 0 000 18zM5.6 5.6l12.8 12.8',
  clock: 'M12 21a9 9 0 100-18 9 9 0 000 18zM12 7v5l3 2',
  alert: 'M12 9v4M12 17h.01M10.3 3.9L2.4 18a2 2 0 001.7 3h15.8a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z',
  'cloud-off': 'M3 3l18 18M17.5 17.5H7a4 4 0 01-.9-7.9M9.2 5.6A6 6 0 0118 10a4 4 0 013.5 4'
}
</script>

<template>
  <main class="flex min-h-screen items-center justify-center bg-background px-4 py-8">
    <UiCard
      as="section"
      class="w-full max-w-lg"
      shadow="md"
      aria-labelledby="ui-error-title"
      :role="isServer ? 'alert' : 'status'"
      :aria-live="isServer ? 'assertive' : 'polite'"
    >
      <div class="flex flex-col items-center gap-4 py-4 text-center sm:py-6">
        <span class="flex size-14 items-center justify-center rounded-full bg-primary-50 text-primary-600">
          <svg
            class="size-7"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path :d="paths[view.icon]" />
          </svg>
        </span>
        <p v-if="code" class="text-sm font-medium text-text-muted">Error {{ code }}</p>
        <h1
          id="ui-error-title"
          ref="titleEl"
          tabindex="-1"
          class="text-xl font-semibold text-text focus:outline-none sm:text-2xl"
        >
          {{ view.title }}
        </h1>
        <p class="max-w-sm text-sm text-text">{{ view.message }}</p>
        <p class="max-w-sm text-sm text-text-muted">{{ view.hint }}</p>

        <pre
          v-if="showDebug && detail"
          class="max-h-40 w-full overflow-auto rounded-md bg-default-100 p-3 text-left text-xs text-default-800"
        >{{ detail }}</pre>

        <slot name="extra" />

        <div class="mt-2 flex w-full flex-col-reverse items-stretch justify-center gap-2 sm:w-auto sm:flex-row sm:items-center">
          <slot name="actions">
            <UiButton v-if="showBack" variant="ghost" @click="goBack">Volver atrás</UiButton>
            <UiButton v-if="!primaryIsHome" variant="secondary" @click="goHome">{{ homeLabel }}</UiButton>
            <UiButton variant="primary" @click="onPrimary">{{ primaryLabel }}</UiButton>
          </slot>
        </div>
      </div>
    </UiCard>
  </main>
</template>
