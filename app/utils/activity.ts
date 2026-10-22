import type { ActivityAction } from '../types/activity'
import { zOptionalText } from './zodFields'

/** Etiqueta de cada acción del historial de actividad. */
export const ACTIVITY_ACTION_LABELS: Record<ActivityAction, string> = {
  activated: 'Activado',
  deactivated: 'Desactivado'
}

/** Motivo opcional de un cambio de estado (`activity_reason` del PATCH, ≤ 255). */
export function zActivityReason() {
  return zOptionalText(255)
}

/**
 * Payload de un `*FormModal` con `is_active` + `activity_reason`: el motivo
 * solo viaja si se está editando (`initialActive` definido) y el estado
 * cambió; si no, se quita (el POST no lo admite y un PATCH sin cambio de
 * estado no lo necesita).
 */
export function withActivityReason<T extends { is_active: boolean, activity_reason: string | null }>(
  values: T,
  initialActive: boolean | undefined
): Omit<T, 'activity_reason'> & { activity_reason?: string | null } {
  if (initialActive !== undefined && values.is_active !== initialActive) return values
  const { activity_reason: _reason, ...rest } = values
  return rest
}
