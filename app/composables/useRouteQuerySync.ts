import type { PaginatedListUrlSync } from './usePaginatedList'
import { parsePageParam } from './usePaginatedList'

/**
 * Adaptador de URL para `usePaginatedList({ urlSync: useRouteQuerySync() })`
 * en Nuxt: `q` y `page` viajan en la consulta (`router.replace`), conserva el
 * resto de parámetros y omite los valores base (sin `q`, página 1).
 * Usa los auto-imports de Nuxt `useRoute`/`useRouter` (se llama en `setup`).
 */
export function useRouteQuerySync(): PaginatedListUrlSync {
  const route = useRoute()
  const router = useRouter()
  return {
    read: () => ({
      q: typeof route.query.q === 'string' ? route.query.q : undefined,
      page: parsePageParam(route.query.page)
    }),
    write: ({ q, page }) => {
      const { q: _q, page: _page, ...rest } = route.query
      router.replace({
        query: { ...rest, ...(q ? { q } : {}), ...(page > 1 ? { page: String(page) } : {}) }
      })
    }
  }
}
