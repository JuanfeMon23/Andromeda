export interface ApiFormErrors {
  /** Error general (para `UiAlert`); `null` si todo se mapeó a campos. */
  formError: string | null
  /** Errores por campo (ruta → mensaje), listos para `setFieldError`. */
  fieldErrors: Record<string, string>
}

export interface MapApiErrorOptions {
  /** Campos que existen en el formulario; solo esos reciben error por campo. */
  fields: readonly string[]
  /** Claves del backend → rutas del formulario, cuando difieren. */
  fieldMap?: Record<string, string>
}

const GENERIC_MESSAGE = 'Ocurrió un error inesperado. Intenta de nuevo.'
const REQUIRED_MESSAGE = 'Este campo es obligatorio.'

interface NormalizedError {
  code?: string
  message?: string
  details?: unknown
}

/**
 * Normaliza distintas formas de error sin depender de la clase de cada app:
 * - objeto con `code`/`message`/`details` (p. ej. `ApiRequestError`);
 * - error crudo de `$fetch` (`err.data` = `{code, message, details}`);
 * - 422 de schema de FastAPI (`err.data.detail` = `[{loc, msg}]`).
 */
function normalize(err: unknown): NormalizedError | null {
  if (!err || typeof err !== 'object') return null
  const obj = err as Record<string, unknown>
  const data = obj.data
  if (data && typeof data === 'object') {
    const d = data as Record<string, unknown>
    if ('code' in d || 'message' in d) {
      return { code: d.code as string, message: d.message as string, details: d.details }
    }
    if (Array.isArray(d.detail)) {
      return { code: 'request_validation', message: undefined, details: d.detail }
    }
  }
  if ('code' in obj || 'details' in obj) {
    return {
      code: obj.code as string | undefined,
      message: obj.message as string | undefined,
      details: obj.details
    }
  }
  return null
}

/**
 * Traduce un error de la API a errores de formulario:
 * - `details` objeto cuyas claves son campos → el `message` va a esos campos
 *   (o al que nombra `details.field`);
 * - `details.missing_fields` (lista) → cada campo conocido queda "obligatorio";
 * - 422 de schema (`details` = `[{loc, msg}]`) → por último segmento de `loc`;
 * - cualquier otro caso → error general.
 */
export function mapApiErrorToForm(err: unknown, options: MapApiErrorOptions): ApiFormErrors {
  const normalized = normalize(err)
  if (!normalized) {
    const message = err instanceof Error && err.message ? err.message : GENERIC_MESSAGE
    return { formError: message, fieldErrors: {} }
  }

  const known = new Set(options.fields)
  const resolve = (key: string): string | null => {
    const mapped = options.fieldMap?.[key] ?? key
    return known.has(mapped) ? mapped : null
  }

  const fieldErrors: Record<string, string> = {}
  const details = normalized.details
  const message = normalized.message

  if (normalized.code === 'request_validation' && Array.isArray(details)) {
    for (const entry of details) {
      if (!entry || typeof entry !== 'object') continue
      const { loc, msg } = entry as { loc?: unknown; msg?: unknown }
      if (!Array.isArray(loc) || typeof msg !== 'string') continue
      const last = [...loc].reverse().find((part): part is string => typeof part === 'string')
      const field = last ? resolve(last) : null
      if (field && !fieldErrors[field]) fieldErrors[field] = msg
    }
  } else if (details && typeof details === 'object' && !Array.isArray(details)) {
    const record = details as Record<string, unknown>
    const missing = record.missing_fields
    if (Array.isArray(missing)) {
      for (const key of missing) {
        const field = typeof key === 'string' ? resolve(key) : null
        if (field) fieldErrors[field] = REQUIRED_MESSAGE
      }
    }
    for (const key of Object.keys(record)) {
      if (key === 'missing_fields' || key === 'field') continue
      const field = resolve(key)
      if (field) fieldErrors[field] = message || GENERIC_MESSAGE
    }
    const named = typeof record.field === 'string' ? resolve(record.field) : null
    if (named) fieldErrors[named] = message || GENERIC_MESSAGE
  }

  const hasFieldErrors = Object.keys(fieldErrors).length > 0
  return { formError: hasFieldErrors ? null : message || GENERIC_MESSAGE, fieldErrors }
}
