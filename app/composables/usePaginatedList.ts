import { computed, getCurrentScope, onScopeDispose, ref, shallowRef, toValue, watch } from 'vue'
import type { ComputedRef, Ref, WatchSource } from 'vue'
import { normalizeSearchTerm } from '../utils/search'
import { useDebouncedRef } from './useDebouncedRef'

/** Parámetros que recibe `fetchPage`. `q` solo viaja si hay término. */
export interface PaginatedListParams {
  page: number
  page_size: number
  q?: string
}

/** Contexto de cada petición: `signal` se aborta si llega una más nueva. */
export interface PaginatedListFetchContext {
  signal: AbortSignal
}

/** Lo mínimo que la capa necesita de una respuesta paginada (el resto de campos se ignora). */
export interface PaginatedListPage<T> {
  items: T[]
  total: number
}

/**
 * Sincronía opcional con la URL: la app decide cómo (en Nuxt, `useRouteQuerySync()`).
 * `read` se llama una vez al crear el listado; `write` cada vez que cambian
 * el término normalizado o la página.
 */
export interface PaginatedListUrlSync {
  read: () => { q?: string, page?: number }
  write: (state: { q: string, page: number }) => void
}

/**
 * Adaptador de caché inyectable. Andromeda guarda las páginas pedidas en un
 * `Map` propio (clave = `scope` + parámetros + valores de los filtros); la app
 * decide cuándo una entrada sigue vigente:
 *
 * - `scope`: nombre del recurso (`'/staff'`). Listados con el mismo `scope`
 *   comparten entradas; `clearPaginatedListCache(scope?)` las descarta.
 * - `stamp()`: se llama justo ANTES de pedir y su valor se guarda con la
 *   entrada (p. ej. hora + versión de invalidación de leo-client).
 * - `isFresh(stamp)`: ¿sigue vigente una entrada con ese sello? (p. ej. TTL
 *   no vencido y sin mutaciones desde entonces). Si es `false`, se vuelve a pedir.
 *
 * `reload()` siempre ignora la caché. Sin este adaptador no hay caché.
 */
export interface PaginatedListCache<S = unknown> {
  scope: string
  stamp: () => S
  isFresh: (stamp: S) => boolean
}

export interface UsePaginatedListOptions<T, S = unknown> {
  /** Pide una página. Lee él mismo los filtros vigentes. Debe respetar `signal` si puede. */
  fetchPage: (params: PaginatedListParams, ctx: PaginatedListFetchContext) => Promise<PaginatedListPage<T>>
  /** Tamaño de página (por defecto 20). Cambiarlo vuelve a la página 1 y recarga. */
  pageSize?: number
  /** Filtros del listado: al cambiar, vuelve a la página 1 y recarga. */
  filters?: WatchSource[]
  /** Cargar al crear (por defecto `true`). */
  immediate?: boolean
  /** Texto del buscador. Se envía como `q` normalizado (vacío = no se envía); al cambiar vuelve a la página 1. */
  search?: Ref<string>
  /** Retardo en ms antes de aplicar `search` (por defecto 0 = inmediato; úsalo si el input no confirma por sí mismo). */
  searchDebounce?: number
  /** Primera página ya conocida (p. ej. hidratada en SSR): se muestra sin pedirla. */
  initialData?: PaginatedListPage<T> | null
  /** Mensaje si el error no trae uno propio (por defecto «No se pudo cargar el listado.»). */
  errorMessage?: string
  /** Mensaje legible del error (p. ej. `toUserMessage`). Si devuelve vacío se usa `error.message` y luego `errorMessage`. */
  mapError?: (error: unknown) => string | null | undefined
  /** Sincronizar `q` y `page` con la URL. */
  urlSync?: PaginatedListUrlSync
  /** Caché de páginas recientes (ver `PaginatedListCache`). */
  cache?: PaginatedListCache<S>
}

export interface UsePaginatedListReturn<T> {
  page: Ref<number>
  pageSize: Ref<number>
  rows: ComputedRef<T[]>
  total: ComputedRef<number>
  loading: ComputedRef<boolean>
  loadError: ComputedRef<string | null>
  /** Término normalizado vigente (el que se envía como `q`). */
  searchTerm: ComputedRef<string>
  /** Recarga la página actual ignorando la caché. */
  reload: () => Promise<void>
  /** Aplica de inmediato el término pendiente del debounce (Enter). No-op sin debounce. */
  flushSearch: () => void
}

const DEFAULT_ERROR = 'No se pudo cargar el listado.'

const cacheStore = new Map<string, { result: PaginatedListPage<unknown>, stamp: unknown }>()

/** Descarta las páginas en caché de un `scope` (o todas sin argumento). */
export function clearPaginatedListCache(scope?: string) {
  if (!scope) return cacheStore.clear()
  for (const key of [...cacheStore.keys()]) if (key.startsWith(`${scope}\u0000`)) cacheStore.delete(key)
}

/** `page` de la URL: entero >= 1, o 1. */
export function parsePageParam(value: unknown): number {
  const n = typeof value === 'string' ? Number(value) : typeof value === 'number' ? value : NaN
  return Number.isInteger(n) && n >= 1 ? n : 1
}

/**
 * Estado de un listado paginado (página, filas, total, carga y error), sin
 * conocer ningún cliente HTTP: la app inyecta `fetchPage`.
 *
 * ```ts
 * const search = ref('')
 * const active = ref<boolean | undefined>()
 * const { rows, total, page, pageSize, loading, loadError, searchTerm, reload } = usePaginatedList({
 *   fetchPage: (params, { signal }) => api.get('/staff', { params: { ...params, active: active.value }, signal }),
 *   search, filters: [active], mapError: toUserMessage
 * })
 * ```
 *
 * Cambiar filtros, término o tamaño vuelve a la página 1 (una sola petición);
 * mientras carga conserva las filas anteriores; una petición nueva aborta la
 * vieja (`signal`) e ignora su respuesta; si la página queda fuera de rango
 * (se borró lo último) salta a la última con datos.
 */
export function usePaginatedList<T, S = unknown>(options: UsePaginatedListOptions<T, S>): UsePaginatedListReturn<T> {
  const { search, urlSync, cache } = options
  const filters = options.filters ?? []

  // Estado inicial desde la URL (antes de crear el debounce, que copia el valor).
  const initialUrl = urlSync?.read()
  const page = ref(parsePageParam(initialUrl?.page))
  if (search && typeof initialUrl?.q === 'string') search.value = normalizeSearchTerm(initialUrl.q)

  const pageSize = ref(options.pageSize ?? 20)

  const debounced = search && (options.searchDebounce ?? 0) > 0
    ? useDebouncedRef(search, options.searchDebounce)
    : undefined
  const searchSource = debounced ? debounced.debounced : search
  const searchTerm = computed(() => normalizeSearchTerm(searchSource?.value))

  const state = shallowRef<PaginatedListPage<T> | null>(options.initialData ?? null)
  const loadingState = ref(false)
  const errorState = ref<string | null>(null)

  let ticket = 0
  let controller: AbortController | undefined

  function messageOf(err: unknown) {
    return options.mapError?.(err)
      || (err instanceof Error && err.message ? err.message : null)
      || options.errorMessage
      || DEFAULT_ERROR
  }

  function currentParams(): PaginatedListParams {
    return {
      page: page.value,
      page_size: pageSize.value,
      ...(searchTerm.value ? { q: searchTerm.value } : {})
    }
  }

  function keyOf(params: PaginatedListParams) {
    return `${cache!.scope}\u0000${JSON.stringify([params.page, params.page_size, params.q ?? '', filters.map(f => toValue(f))])}`
  }

  /** Si la página quedó fuera de rango, salta a la última con datos (el watcher recarga). */
  function fixRange(result: PaginatedListPage<T>) {
    const lastPage = Math.max(1, Math.ceil(result.total / pageSize.value))
    if (!result.items.length && page.value > lastPage) page.value = lastPage
  }

  async function load(force = false) {
    const mine = ++ticket
    controller?.abort()
    const params = currentParams()

    if (cache && !force) {
      const hit = cacheStore.get(keyOf(params))
      if (hit && cache.isFresh(hit.stamp as S)) {
        controller = undefined
        state.value = hit.result as PaginatedListPage<T>
        errorState.value = null
        loadingState.value = false
        fixRange(state.value)
        return
      }
    }

    const ctl = new AbortController()
    controller = ctl
    loadingState.value = true
    errorState.value = null
    const stamp = cache?.stamp()
    try {
      const result = await options.fetchPage(params, { signal: ctl.signal })
      if (mine !== ticket) return
      state.value = result
      if (cache) cacheStore.set(keyOf(params), { result, stamp })
      fixRange(result)
    } catch (err) {
      if (mine !== ticket) return
      errorState.value = messageOf(err)
    } finally {
      if (mine === ticket) loadingState.value = false
    }
  }

  // Síncrono: la página ya es 1 cuando corre el watcher de recarga (una sola petición).
  const resetSources: WatchSource[] = [...filters, pageSize, ...(search ? [searchTerm] : [])]
  watch(resetSources, () => { page.value = 1 }, { flush: 'sync' })
  watch([page, searchTerm, pageSize, ...filters] as WatchSource[], () => { void load() })

  if (urlSync) {
    watch([page, searchTerm], () => urlSync.write({ q: searchTerm.value, page: page.value }))
  }

  if ((options.immediate ?? true) && !options.initialData) void load()

  if (getCurrentScope()) {
    onScopeDispose(() => {
      ticket++
      controller?.abort()
    })
  }

  return {
    page,
    pageSize,
    rows: computed(() => state.value?.items ?? []),
    total: computed(() => state.value?.total ?? 0),
    loading: computed(() => loadingState.value),
    loadError: computed(() => errorState.value),
    searchTerm,
    reload: () => load(true),
    flushSearch: () => debounced?.flush()
  }
}
