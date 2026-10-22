import { computed, inject, reactive, ref, toValue, watch } from 'vue'
import type { InjectionKey, MaybeRefOrGetter } from 'vue'
import type { ActivityEntityType, ActivityEventRead, ActivityFetcher } from '../types/activity'

/**
 * La app provee su `ActivityFetcher` una vez (plugin:
 * `nuxtApp.vueApp.provide(ACTIVITY_FETCHER_KEY, fetcher)`) y
 * `UiFormModal :activity` / `UiActivityTimeline` lo usan sin props.
 */
export const ACTIVITY_FETCHER_KEY: InjectionKey<ActivityFetcher> = Symbol('ActivityFetcher')

export interface UseActivityOptions {
  /** Eventos por página (por defecto 20). */
  pageSize?: number
  /** Cómo pedir el historial; por defecto el provisto con `ACTIVITY_FETCHER_KEY`. */
  fetcher?: ActivityFetcher
  /** Mensaje legible del error (p. ej. `toUserMessage`). */
  mapError?: (error: unknown) => string | null | undefined
}

/**
 * Historial de activación/desactivación de una entidad (más reciente
 * primero). Carga al crearse (y cada vez que cambia el id); `loadMore()`
 * agrega la página siguiente. Sin id (`null`) queda vacío y no consulta.
 * Sin fetcher (ni provisto) queda vacío con un error legible.
 */
export function useActivity(
  entityType: MaybeRefOrGetter<ActivityEntityType>,
  entityId: MaybeRefOrGetter<string | null | undefined>,
  options: UseActivityOptions = {}
) {
  const fetcher = options.fetcher ?? inject(ACTIVITY_FETCHER_KEY, null)
  const pageSize = options.pageSize ?? 20

  const events = ref<ActivityEventRead[]>([])
  const total = ref(0)
  const page = ref(0)
  const loading = ref(false)
  const error = ref<string | null>(null)
  let requestId = 0

  const hasMore = computed(() => events.value.length < total.value)

  async function fetchPage(next: number) {
    const id = toValue(entityId)
    if (!id) return
    if (!fetcher) {
      error.value = 'No se configuró cómo cargar la actividad.'
      return
    }
    const current = ++requestId
    loading.value = true
    error.value = null
    try {
      const result = await fetcher({ entityType: toValue(entityType), entityId: id, page: next, pageSize })
      if (current !== requestId) return
      events.value = next === 1 ? result.items : [...events.value, ...result.items]
      total.value = result.total
      page.value = next
    } catch (err) {
      if (current !== requestId) return
      error.value = options.mapError?.(err)
        || (err instanceof Error && err.message ? err.message : null)
        || 'No se pudo cargar la actividad.'
    } finally {
      if (current === requestId) loading.value = false
    }
  }

  function reload() {
    events.value = []
    total.value = 0
    page.value = 0
    return fetchPage(1)
  }

  function loadMore() {
    return fetchPage(page.value + 1)
  }

  watch(() => [toValue(entityType), toValue(entityId)], reload, { immediate: true })

  return reactive({ events, total, loading, error, hasMore, reload, loadMore })
}
