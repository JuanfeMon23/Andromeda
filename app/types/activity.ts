/**
 * Historial de activación/desactivación, común a toda entidad con
 * `is_active` (regla de negocio: nada se elimina, se desactiva, y cada cambio
 * de estado queda con fecha-hora y motivo).
 */

/** Nombre de la entidad en la API (la app lo acota con su propio enum). */
export type ActivityEntityType = string

export type ActivityAction = 'activated' | 'deactivated'

export interface ActivityEventRead {
  id: string
  entity_type: ActivityEntityType
  entity_id: string
  action: ActivityAction
  reason: string | null
  occurred_at: string
}

/** Cuerpo parcial de un PATCH que cambia `is_active` (motivo opcional, ≤ 255). */
export interface ActivityChange {
  is_active: boolean
  activity_reason: string | null
}

/** Página de eventos que devuelve el `ActivityFetcher`. */
export interface ActivityPage {
  items: ActivityEventRead[]
  total: number
}

/**
 * Cómo la app pide el historial a su API (la capa no conoce el cliente HTTP).
 * Debe devolver el más reciente primero.
 */
export type ActivityFetcher = (query: {
  entityType: ActivityEntityType
  entityId: string
  page: number
  pageSize: number
}) => Promise<ActivityPage>
