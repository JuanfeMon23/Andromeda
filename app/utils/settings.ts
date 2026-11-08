import { formatDateTime } from './formatDateTime'
import type { SettingDraft, SettingItem, SettingType, SettingValue } from '../types/settings'

export const REASON_MIN = 3
export const REASON_MAX = 500

export const SETTINGS_PROPAGATION_NOTICE = 'Los cambios pueden tardar hasta 10 s en aplicarse en todas las instancias.'

/** Valor mostrado de un ajuste (o de una fila de historial), con su unidad. */
export function formatSettingValue(value: unknown, type: SettingType | undefined, unit?: string | null): string {
  if (value === null || value === undefined) return '—'
  if (type === 'bool' || typeof value === 'boolean') {
    const on = value === true || value === 'true'
    return on ? 'Activado' : 'Desactivado'
  }
  const text = String(value)
  if (type === 'str') return text === '' ? '(vacío)' : text
  return unit ? `${text} ${unit}` : text
}

/** Borrador inicial (el valor vigente) para el editor. */
export function toDraft(setting: Pick<SettingItem, 'type' | 'value'>, value: SettingValue = setting.value): SettingDraft {
  return setting.type === 'bool' ? value === true || value === 'true' : String(value ?? '')
}

/** Rango legible: «De 1 a 100 s», «Mínimo 1», «Máximo 5» o `''` si no hay límites. */
export function describeRange(min: number | null | undefined, max: number | null | undefined, unit?: string | null): string {
  const unitSuffix = unit ? ` ${unit}` : ''
  const hasMin = min !== null && min !== undefined
  const hasMax = max !== null && max !== undefined
  if (hasMin && hasMax) return `De ${min} a ${max}${unitSuffix}`
  if (hasMin) return `Mínimo ${min}${unitSuffix}`
  if (hasMax) return `Máximo ${max}${unitSuffix}`
  return ''
}

export type ParsedDraft = { ok: true, value: SettingValue } | { ok: false, message: string }

/** Convierte el borrador al valor tipado del contrato, validando tipo y rango. */
export function parseDraft(setting: Pick<SettingItem, 'type' | 'min' | 'max' | 'unit'>, draft: SettingDraft): ParsedDraft {
  if (setting.type === 'bool') return { ok: true, value: draft === true || draft === 'true' }
  const text = typeof draft === 'string' ? draft.trim() : String(draft)
  if (setting.type === 'str') return { ok: true, value: typeof draft === 'string' ? draft : text }
  if (text === '') return { ok: false, message: 'Escribe un valor.' }
  const number = Number(text)
  if (!Number.isFinite(number)) return { ok: false, message: 'Debe ser un número.' }
  if (setting.type === 'int' && !/^[+-]?\d+$/.test(text)) return { ok: false, message: 'Debe ser un número entero.' }
  const range = describeRange(setting.min, setting.max, setting.unit)
  if (setting.min != null && number < setting.min) return { ok: false, message: `Fuera de rango. ${range}.` }
  if (setting.max != null && number > setting.max) return { ok: false, message: `Fuera de rango. ${range}.` }
  return { ok: true, value: number }
}

export function sameValue(left: unknown, right: unknown): boolean {
  if (typeof left === 'boolean' || typeof right === 'boolean') return (left === true || left === 'true') === (right === true || right === 'true')
  return String(left) === String(right)
}

/** «Última modificación: <fecha> por <usuario>», o `''` si nunca se modificó. */
export function describeLastChange(setting: Pick<SettingItem, 'updated_at' | 'updated_by_username' | 'updated_by'>): string {
  if (!setting.updated_at) return ''
  const when = formatDateTime(setting.updated_at)
  const who = setting.updated_by_username || setting.updated_by
  return who ? `Última modificación: ${when} por ${who}` : `Última modificación: ${when}`
}

export interface ApiErrorInfo {
  code: string | null
  message: string | null
  details: Record<string, unknown>
}

/** Lee `{code, message, details}` de un error normalizado por la app o de `error.data`. */
export function readApiError(error: unknown): ApiErrorInfo {
  const errorShape = (error ?? {}) as {
    code?: unknown, message?: unknown, details?: unknown
    data?: { code?: unknown, message?: unknown, details?: unknown } | null
  }
  const code = typeof errorShape.code === 'string' ? errorShape.code : typeof errorShape.data?.code === 'string' ? errorShape.data.code : null
  const message = typeof errorShape.message === 'string' ? errorShape.message : typeof errorShape.data?.message === 'string' ? errorShape.data.message : null
  const rawDetails = errorShape.details ?? errorShape.data?.details
  const details = rawDetails && typeof rawDetails === 'object' && !Array.isArray(rawDetails)
    ? rawDetails as Record<string, unknown>
    : {}
  return { code, message, details }
}

/** Mensaje en español para los errores de `PUT /settings/{key}` (excepto el 409, que recarga). */
export function settingErrorMessage(error: unknown, setting?: Pick<SettingItem, 'unit'>): string | null {
  const { code, details } = readApiError(error)
  const num = (candidate: unknown) => (typeof candidate === 'number' ? candidate : null)
  switch (code) {
    case 'setting_out_of_range': {
      const range = describeRange(num(details.min), num(details.max), setting?.unit)
      return range ? `El valor está fuera del rango permitido. ${range}.` : 'El valor está fuera del rango permitido.'
    }
    case 'setting_type_mismatch': return 'El valor no tiene el tipo que espera este ajuste.'
    case 'setting_invalid_value': return 'El valor no es válido para este ajuste.'
    case 'reason_required': return `El motivo es obligatorio (entre ${REASON_MIN} y ${REASON_MAX} caracteres).`
    case 'setting_not_found': return 'Este ajuste ya no existe. Recarga la pantalla.'
    default: return null
  }
}
