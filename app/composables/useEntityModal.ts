import { reactive, ref, shallowRef } from 'vue'

/**
 * Estado del modal "crear / ver-editar" de un listado: si está abierto y qué
 * entidad muestra (`null` = crear). Se pasa a un `<XxxFormModal
 * v-model:open="modal.open" :entity="modal.entity">`.
 *
 * ```ts
 * const modal = useEntityModal<StaffRead>()
 * modal.openCreate()      // botón "Nuevo"
 * modal.openEdit(row)     // botón "Ver / Editar" de una fila
 * ```
 */
export function useEntityModal<T>() {
  const open = ref(false)
  const entity = shallowRef<T | null>(null)

  function openCreate() {
    entity.value = null
    open.value = true
  }

  function openEdit(value: T) {
    entity.value = value
    open.value = true
  }

  function close() {
    open.value = false
  }

  return reactive({ open, entity, openCreate, openEdit, close })
}

export type EntityModal<T> = ReturnType<typeof useEntityModal<T>>

export interface OpenEntityFromQueryArgs<T> {
  /** Consulta actual (`route.query`). */
  query: Record<string, unknown>
  modal: { openEdit: (value: T) => void }
  /** Trae la entidad por id (la app inyecta su cliente). */
  get: (id: string) => Promise<T>
  /** Quita el parámetro de la URL: recibe la consulta sin él. */
  replaceQuery: (query: Record<string, unknown>) => void
  /** Parámetro (por defecto `open`). */
  key?: string
}

/**
 * Lógica de `?open=<id>`: si la consulta trae el parámetro, lo quita de la URL
 * y abre el modal con la entidad; si ya no existe, deja el listado como está.
 * Devuelve `true` si abrió el modal.
 */
export async function openEntityFromQuery<T>({ query, modal, get, replaceQuery, key = 'open' }: OpenEntityFromQueryArgs<T>): Promise<boolean> {
  const id = query[key]
  if (typeof id !== 'string' || !id) return false
  const { [key]: _removed, ...rest } = query
  replaceQuery(rest)
  try {
    modal.openEdit(await get(id))
    return true
  } catch {
    return false
  }
}
