import { beforeEach, describe, expect, it, vi } from 'vitest'
import { effectScope, ref } from 'vue'
import {
  clearPaginatedListCache,
  parsePageParam,
  usePaginatedList,
  type PaginatedListPage,
  type PaginatedListUrlSync,
  type UsePaginatedListOptions
} from './usePaginatedList'

type Fetch = UsePaginatedListOptions<string>['fetchPage']

const settle = () => new Promise<void>(resolve => setTimeout(resolve, 0))

function page(items: string[], total = items.length): PaginatedListPage<string> {
  return { items, total }
}

function rejected(err: unknown): Promise<never> {
  const p = Promise.reject(err)
  p.catch(() => {})
  return p
}

function deferred<T>() {
  let resolve!: (v: T) => void
  const promise = new Promise<T>((r) => { resolve = r })
  return { promise, resolve }
}

/** Crea el listado dentro de un scope (como un `setup`) y espera la primera carga. */
async function make(fetchPage: Fetch, options: Partial<UsePaginatedListOptions<string>> = {}) {
  const scope = effectScope()
  const list = scope.run(() => usePaginatedList<string>({ fetchPage, ...options }))!
  await settle()
  return { list, scope }
}

beforeEach(() => { clearPaginatedListCache() })

describe('usePaginatedList', () => {
  it('carga la página 1 al crear con el tamaño por defecto (20)', async () => {
    const fetchPage = vi.fn<Fetch>(async () => page(['a', 'b'], 42))
    const { list } = await make(fetchPage)
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage.mock.calls[0]![0]).toEqual({ page: 1, page_size: 20 })
    expect(list.rows.value).toEqual(['a', 'b'])
    expect(list.total.value).toBe(42)
    expect(list.loading.value).toBe(false)
    expect(list.loadError.value).toBeNull()
  })

  it('immediate: false no carga hasta reload()', async () => {
    const fetchPage = vi.fn<Fetch>(async () => page(['a']))
    const { list } = await make(fetchPage, { immediate: false, pageSize: 5 })
    expect(fetchPage).not.toHaveBeenCalled()
    await list.reload()
    expect(fetchPage.mock.calls[0]![0]).toEqual({ page: 1, page_size: 5 })
  })

  it('loading es true mientras carga', async () => {
    const d = deferred<PaginatedListPage<string>>()
    const { list } = await make(() => d.promise)
    expect(list.loading.value).toBe(true)
    d.resolve(page(['a']))
    await settle()
    expect(list.loading.value).toBe(false)
    expect(list.rows.value).toEqual(['a'])
  })

  it('cambiar de página recarga con esa página', async () => {
    const fetchPage = vi.fn<Fetch>(async ({ page: p }) => page([`fila-${p}`]))
    const { list } = await make(fetchPage)
    list.page.value = 3
    await settle()
    expect(fetchPage.mock.lastCall![0]).toEqual({ page: 3, page_size: 20 })
    expect(list.rows.value).toEqual(['fila-3'])
  })

  it('cambiar un filtro desde la página 1 recarga una vez', async () => {
    const filter = ref<boolean | undefined>()
    const fetchPage = vi.fn<Fetch>(async () => page(['a']))
    await make(fetchPage, { filters: [filter] })
    filter.value = true
    await settle()
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('cambiar un filtro desde otra página vuelve a la 1 y recarga una sola vez', async () => {
    const filter = ref('x')
    const fetchPage = vi.fn<Fetch>(async () => page(['a']))
    const { list } = await make(fetchPage, { filters: [filter] })
    list.page.value = 4
    await settle()
    fetchPage.mockClear()
    filter.value = 'y'
    await settle()
    expect(list.page.value).toBe(1)
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage.mock.calls[0]![0]).toEqual({ page: 1, page_size: 20 })
  })

  it('el fetchPage lee el filtro vigente (p. ej. active / include_inactive)', async () => {
    const active = ref<boolean | undefined>()
    const calls: Array<boolean | undefined> = []
    const { list } = await make(async () => { calls.push(active.value); return page([]) }, { filters: [active] })
    active.value = false
    await settle()
    expect(calls).toEqual([undefined, false])
    expect(list.rows.value).toEqual([])
  })

  it('cambiar el tamaño de página vuelve a la 1 y recarga', async () => {
    const fetchPage = vi.fn<Fetch>(async () => page(['a'], 100))
    const { list } = await make(fetchPage)
    list.page.value = 3
    await settle()
    fetchPage.mockClear()
    list.pageSize.value = 50
    await settle()
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage.mock.calls[0]![0]).toEqual({ page: 1, page_size: 50 })
  })

  it('un error con mensaje queda en loadError y loading vuelve a false', async () => {
    const { list } = await make(() => rejected(new Error('Fallo del servidor.')))
    expect(list.loadError.value).toBe('Fallo del servidor.')
    expect(list.loading.value).toBe(false)
  })

  it('un error sin mensaje usa errorMessage y luego un genérico', async () => {
    const { list } = await make(() => rejected('boom'), { errorMessage: 'No se pudo cargar el personal.' })
    expect(list.loadError.value).toBe('No se pudo cargar el personal.')
    const generic = await make(() => rejected('boom'))
    expect(generic.list.loadError.value).toBe('No se pudo cargar el listado.')
  })

  it('mapError tiene prioridad; si devuelve vacío se usa message y luego errorMessage', async () => {
    const mapped = await make(() => rejected(new Error('crudo')), { mapError: () => 'Legible.' })
    expect(mapped.list.loadError.value).toBe('Legible.')
    const fallbackMsg = await make(() => rejected(new Error('crudo')), { mapError: () => '' })
    expect(fallbackMsg.list.loadError.value).toBe('crudo')
    const fallbackOpt = await make(() => rejected('x'), { mapError: () => undefined, errorMessage: 'Propio.' })
    expect(fallbackOpt.list.loadError.value).toBe('Propio.')
  })

  it('una recarga exitosa limpia el loadError anterior', async () => {
    let fail = true
    const { list } = await make(() => (fail ? rejected(new Error('mal')) : Promise.resolve(page(['ok']))))
    expect(list.loadError.value).toBe('mal')
    fail = false
    await list.reload()
    expect(list.loadError.value).toBeNull()
    expect(list.rows.value).toEqual(['ok'])
  })

  it('ignora la respuesta de una petición vieja que termina después de la nueva', async () => {
    const first = deferred<PaginatedListPage<string>>()
    const second = deferred<PaginatedListPage<string>>()
    const queue = [first, second]
    const { list } = await make(() => queue.shift()!.promise)
    const reloading = list.reload()
    second.resolve(page(['nueva']))
    await reloading
    first.resolve(page(['vieja']))
    await settle()
    expect(list.rows.value).toEqual(['nueva'])
    expect(list.loading.value).toBe(false)
  })

  it('aborta el signal de la petición anterior al recargar', async () => {
    const signals: AbortSignal[] = []
    const d = deferred<PaginatedListPage<string>>()
    let first = true
    const { list } = await make(async (_p, { signal }) => {
      signals.push(signal)
      if (first) { first = false; return d.promise }
      return page(['b'])
    })
    await list.reload()
    expect(signals).toHaveLength(2)
    expect(signals[0]!.aborted).toBe(true)
    expect(signals[1]!.aborted).toBe(false)
  })

  it('al destruir el scope aborta la petición en curso y descarta su respuesta', async () => {
    const d = deferred<PaginatedListPage<string>>()
    let signal!: AbortSignal
    const { list, scope } = await make(async (_p, ctx) => { signal = ctx.signal; return d.promise })
    scope.stop()
    expect(signal.aborted).toBe(true)
    d.resolve(page(['tarde']))
    await settle()
    expect(list.rows.value).toEqual([])
  })

  it('corrige una página fuera de rango saltando a la última con datos', async () => {
    const fetchPage = vi.fn<Fetch>(async ({ page: p }) => (p > 2 ? page([], 30) : page([`p${p}`], 30)))
    const { list } = await make(fetchPage, { pageSize: 20 })
    list.page.value = 5
    await settle()
    expect(list.page.value).toBe(2)
    expect(list.rows.value).toEqual(['p2'])
  })

  it('sin datos en absoluto la página fuera de rango queda en 1', async () => {
    const { list } = await make(async () => page([], 0))
    list.page.value = 3
    await settle()
    expect(list.page.value).toBe(1)
  })

  it('initialData se muestra sin pedir la primera página', async () => {
    const fetchPage = vi.fn<Fetch>(async () => page(['otra']))
    const { list } = await make(fetchPage, { initialData: page(['ssr'], 7) })
    expect(fetchPage).not.toHaveBeenCalled()
    expect(list.rows.value).toEqual(['ssr'])
    expect(list.total.value).toBe(7)
    await list.reload()
    expect(list.rows.value).toEqual(['otra'])
  })
})

describe('usePaginatedList: búsqueda (search)', () => {
  it('envía q normalizado (recortado) junto a la paginación', async () => {
    const search = ref('')
    const fetchPage = vi.fn<Fetch>(async () => page([]))
    await make(fetchPage, { search })
    search.value = '  herrera  '
    await settle()
    expect(fetchPage.mock.lastCall![0]).toEqual({ page: 1, page_size: 20, q: 'herrera' })
  })

  it('sin texto no envía q (ni en la primera carga)', async () => {
    const search = ref('   ')
    const fetchPage = vi.fn<Fetch>(async () => page([]))
    await make(fetchPage, { search })
    expect(fetchPage.mock.calls[0]![0]).toEqual({ page: 1, page_size: 20 })
    expect(fetchPage.mock.calls[0]![0]).not.toHaveProperty('q')
  })

  it('al cambiar el término desde otra página vuelve a la 1 y recarga una sola vez', async () => {
    const search = ref('')
    const fetchPage = vi.fn<Fetch>(async () => page(['a']))
    const { list } = await make(fetchPage, { search })
    list.page.value = 3
    await settle()
    fetchPage.mockClear()
    search.value = 'hemo'
    await settle()
    expect(list.page.value).toBe(1)
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage.mock.calls[0]![0]).toEqual({ page: 1, page_size: 20, q: 'hemo' })
  })

  it('no repite la petición si el término normalizado no cambió', async () => {
    const search = ref('hemo')
    const fetchPage = vi.fn<Fetch>(async () => page(['a']))
    await make(fetchPage, { search })
    fetchPage.mockClear()
    search.value = '  hemo '
    await settle()
    expect(fetchPage).not.toHaveBeenCalled()
  })

  it('expone searchTerm normalizado para el estado vacío', async () => {
    const search = ref('')
    const { list } = await make(async () => page([]), { search })
    expect(list.searchTerm.value).toBe('')
    search.value = ' mg  dl '
    await settle()
    expect(list.searchTerm.value).toBe('mg dl')
  })

  it('conserva las filas anteriores mientras busca (loading en true)', async () => {
    const search = ref('')
    const second = deferred<PaginatedListPage<string>>()
    const queue: Array<Promise<PaginatedListPage<string>>> = [Promise.resolve(page(['previa'])), second.promise]
    const { list } = await make(() => queue.shift()!, { search })
    search.value = 'x'
    await settle()
    expect(list.loading.value).toBe(true)
    expect(list.rows.value).toEqual(['previa'])
    second.resolve(page(['nueva']))
    await settle()
    expect(list.rows.value).toEqual(['nueva'])
    expect(list.loading.value).toBe(false)
  })

  it('ignora la respuesta de una búsqueda vieja que llega después de la nueva', async () => {
    const search = ref('')
    const old = deferred<PaginatedListPage<string>>()
    const fresh = deferred<PaginatedListPage<string>>()
    const queue: Array<Promise<PaginatedListPage<string>>> = [Promise.resolve(page([])), old.promise, fresh.promise]
    const { list } = await make(() => queue.shift()!, { search })
    search.value = 'a'
    await settle()
    search.value = 'ab'
    await settle()
    fresh.resolve(page(['ab']))
    await settle()
    old.resolve(page(['a']))
    await settle()
    expect(list.rows.value).toEqual(['ab'])
  })

  it('con searchDebounce espera a que se deje de escribir y flushSearch lo aplica ya', async () => {
    vi.useFakeTimers()
    try {
      const search = ref('')
      const fetchPage = vi.fn<Fetch>(async () => page([]))
      const scope = effectScope()
      const list = scope.run(() => usePaginatedList<string>({ fetchPage, search, searchDebounce: 300 }))!
      await vi.advanceTimersByTimeAsync(0)
      fetchPage.mockClear()
      search.value = 'he'
      await vi.advanceTimersByTimeAsync(100)
      search.value = 'hem'
      await vi.advanceTimersByTimeAsync(200)
      expect(fetchPage).not.toHaveBeenCalled()
      await vi.advanceTimersByTimeAsync(150)
      expect(fetchPage).toHaveBeenCalledTimes(1)
      expect(fetchPage.mock.calls[0]![0]).toEqual({ page: 1, page_size: 20, q: 'hem' })
      search.value = 'hemo'
      await vi.advanceTimersByTimeAsync(0)
      list.flushSearch()
      await vi.advanceTimersByTimeAsync(0)
      expect(fetchPage).toHaveBeenCalledTimes(2)
      expect(fetchPage.mock.lastCall![0].q).toBe('hemo')
      scope.stop()
    } finally {
      vi.useRealTimers()
    }
  })
})

describe('usePaginatedList: sincronía con la URL (urlSync)', () => {
  function fakeUrl(initial: { q?: string, page?: number } = {}) {
    const writes: Array<{ q: string, page: number }> = []
    const sync: PaginatedListUrlSync = { read: () => initial, write: (state) => { writes.push(state) } }
    return { sync, writes }
  }

  it('escribe q y page al cambiar y vuelve al estado base', async () => {
    const search = ref('')
    const { sync, writes } = fakeUrl()
    const { list } = await make(async () => page(['a'], 100), { search, urlSync: sync })
    search.value = 'herrera'
    await settle()
    expect(writes.at(-1)).toEqual({ q: 'herrera', page: 1 })
    list.page.value = 2
    await settle()
    expect(writes.at(-1)).toEqual({ q: 'herrera', page: 2 })
    search.value = ''
    await settle()
    expect(writes.at(-1)).toEqual({ q: '', page: 1 })
  })

  it('arranca con q y page de la URL (compartir un enlace) con una sola petición', async () => {
    const search = ref('')
    const fetchPage = vi.fn<Fetch>(async () => page(['a'], 100))
    const { list } = await make(fetchPage, { search, urlSync: fakeUrl({ q: 'hemograma', page: 3 }).sync })
    expect(search.value).toBe('hemograma')
    expect(list.page.value).toBe(3)
    expect(fetchPage).toHaveBeenCalledTimes(1)
    expect(fetchPage.mock.calls[0]![0]).toEqual({ page: 3, page_size: 20, q: 'hemograma' })
  })

  it('una page inválida de la URL se toma como 1', async () => {
    const { list } = await make(async () => page([]), { search: ref(''), urlSync: fakeUrl({ page: Number.NaN }).sync })
    expect(list.page.value).toBe(1)
  })

  it('sin urlSync no escribe nada', async () => {
    const search = ref('')
    const { writes } = fakeUrl()
    await make(async () => page([]), { search })
    search.value = 'zzz'
    await settle()
    expect(writes).toEqual([])
  })

  it('parsePageParam acepta enteros >= 1 y descarta el resto', () => {
    expect(parsePageParam('3')).toBe(3)
    expect(parsePageParam('abc')).toBe(1)
    expect(parsePageParam('0')).toBe(1)
    expect(parsePageParam('1.5')).toBe(1)
    expect(parsePageParam(undefined)).toBe(1)
  })
})

describe('usePaginatedList: caché inyectable (cache)', () => {
  function makeCache(scope: string) {
    let version = 0
    return {
      cache: { scope, stamp: () => version, isFresh: (stamp: number) => stamp === version },
      invalidate: () => { version++ }
    }
  }

  it('volver a una página reciente sale de la caché (sin nueva petición)', async () => {
    const fetchPage = vi.fn<Fetch>(async ({ page: p }) => page([`p${p}`]))
    const { list } = await make(fetchPage, { cache: makeCache('/t-cache').cache })
    list.page.value = 2
    await settle()
    list.page.value = 1
    await settle()
    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(list.rows.value).toEqual(['p1'])
  })

  it('volver a una búsqueda reciente sale de la caché', async () => {
    const search = ref('')
    const fetchPage = vi.fn<Fetch>(async ({ q }) => page([q ?? 'todo']))
    const { list } = await make(fetchPage, { cache: makeCache('/t-cache-q').cache, search })
    search.value = 'abc'
    await settle()
    search.value = ''
    await settle()
    expect(fetchPage).toHaveBeenCalledTimes(2)
    expect(list.rows.value).toEqual(['todo'])
  })

  it('los filtros forman parte de la clave de caché', async () => {
    const active = ref<boolean | undefined>()
    const fetchPage = vi.fn<Fetch>(async () => page([String(active.value)]))
    const { list } = await make(fetchPage, { cache: makeCache('/t-cache-f').cache, filters: [active] })
    active.value = true
    await settle()
    expect(list.rows.value).toEqual(['true'])
    active.value = undefined
    await settle()
    expect(list.rows.value).toEqual(['undefined'])
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('reload() siempre refresca (ignora la caché)', async () => {
    const fetchPage = vi.fn<Fetch>(async () => page(['x']))
    const { list } = await make(fetchPage, { cache: makeCache('/t-reload').cache })
    await list.reload()
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('una invalidación (isFresh = false) hace que volver a la página ya vista recargue', async () => {
    const fetchPage = vi.fn<Fetch>(async ({ page: p }) => page([`p${p}`]))
    const c = makeCache('/t-inval')
    const { list } = await make(fetchPage, { cache: c.cache })
    list.page.value = 2
    await settle()
    c.invalidate()
    list.page.value = 1
    await settle()
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })

  it('el sello se toma ANTES de pedir: una invalidación durante la petición deja la entrada vieja', async () => {
    const d = deferred<PaginatedListPage<string>>()
    const fetchPage = vi.fn<Fetch>()
      .mockImplementationOnce(() => d.promise)
      .mockImplementation(async () => page(['segunda']))
    const c = makeCache('/t-stamp')
    const { list } = await make(fetchPage, { cache: c.cache })
    c.invalidate()
    d.resolve(page(['primera']))
    await settle()
    list.page.value = 2
    await settle()
    list.page.value = 1
    await settle()
    expect(fetchPage).toHaveBeenCalledTimes(3)
    expect(list.rows.value).toEqual(['segunda'])
  })

  it('listados con el mismo scope comparten entradas; clearPaginatedListCache(scope) las descarta', async () => {
    const fetchPage = vi.fn<Fetch>(async () => page(['x']))
    const c = makeCache('/t-shared')
    await make(fetchPage, { cache: c.cache })
    await make(fetchPage, { cache: c.cache })
    expect(fetchPage).toHaveBeenCalledTimes(1)
    clearPaginatedListCache('/t-shared')
    await make(fetchPage, { cache: c.cache })
    expect(fetchPage).toHaveBeenCalledTimes(2)
  })

  it('sin adaptador no hay caché', async () => {
    const fetchPage = vi.fn<Fetch>(async ({ page: p }) => page([`p${p}`]))
    const { list } = await make(fetchPage)
    list.page.value = 2
    await settle()
    list.page.value = 1
    await settle()
    expect(fetchPage).toHaveBeenCalledTimes(3)
  })
})
