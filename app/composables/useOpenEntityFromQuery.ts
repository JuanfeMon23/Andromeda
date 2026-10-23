import { onMounted } from 'vue'
import { openEntityFromQuery } from './useEntityModal'

/**
 * Al montar el listado abre el modal de la entidad indicada en la URL
 * (`/<modulo>?open=<id>`) y quita el parámetro. Envoltorio de Nuxt
 * (`useRoute`/`useRouter`) sobre `openEntityFromQuery`.
 */
export function useOpenEntityFromQuery<T>(
  modal: { openEdit: (value: T) => void },
  get: (id: string) => Promise<T>,
  key = 'open'
) {
  const route = useRoute()
  const router = useRouter()
  onMounted(() => openEntityFromQuery({
    query: route.query,
    modal,
    get,
    key,
    replaceQuery: (query) => { router.replace({ query: query as typeof route.query }) }
  }))
}
