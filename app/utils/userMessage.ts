/**
 * Mensaje legible para el usuario a partir de cualquier error de una llamada
 * HTTP. Regla de todas las aplicaciones: la interfaz NUNCA muestra el texto
 * crudo de `fetch`/`$fetch` (`[GET] "http://…": <no response> Failed to fetch`)
 * ni trazas del servidor; solo mensajes en español comprensibles.
 */

export const NETWORK_MESSAGE =
  'No se pudo conectar con el servidor. Verifica tu conexión e inténtalo de nuevo.'
export const TIMEOUT_MESSAGE = 'El servidor tardó demasiado en responder. Inténtalo de nuevo.'
export const SERVER_MESSAGE =
  'Ocurrió un error en el servidor. Inténtalo de nuevo en unos minutos.'
export const UNKNOWN_MESSAGE = 'Ocurrió un error inesperado. Inténtalo de nuevo.'
export const VALIDATION_MESSAGE = 'Algunos datos no son válidos. Revisa los campos marcados.'

const NETWORK_PATTERNS = [
  /failed to fetch/i,
  /network\s?error/i,
  /fetch failed/i,
  /load failed/i,
  /<no response>/i,
  /econnrefused/i,
  /err_connection/i,
  /network request failed/i
]

// Textos que delatan un error técnico (no apto para el usuario).
const TECHNICAL_PATTERNS = [
  /traceback/i,
  /^\[(get|post|put|patch|delete)\]/i,
  /integrityerror|sqlalchemy|asyncpg|psycopg|violates .*constraint/i,
  /<\/?[a-z][\s\S]*>/i, // HTML
  /\bat\s+\S+\s+\(.*:\d+:\d+\)/ // stack frame de JS
]

interface ErrorLike {
  name?: string
  message?: string
  code?: string
  status?: number
  statusCode?: number
  statusText?: string
  response?: { status?: number }
  data?: { code?: string; message?: string; detail?: unknown } | null
}

function isTechnical(text: string): boolean {
  return TECHNICAL_PATTERNS.some((p) => p.test(text))
}

function statusOf(err: ErrorLike): number | undefined {
  return err.status ?? err.statusCode ?? err.response?.status
}

export function toUserMessage(err: unknown): string {
  if (!err || typeof err !== 'object') return UNKNOWN_MESSAGE
  const e = err as ErrorLike
  const status = statusOf(e)
  const text = typeof e.message === 'string' ? e.message : ''

  if (e.name === 'TimeoutError' || e.name === 'AbortError' || /timed? ?out/i.test(text)) {
    return TIMEOUT_MESSAGE
  }

  // Sin respuesta HTTP: caída de red, servidor apagado, CORS, etc.
  const looksLikeNetwork = NETWORK_PATTERNS.some((p) => p.test(text))
  if (status === undefined && !e.data && (looksLikeNetwork || e.name === 'FetchError')) {
    return NETWORK_MESSAGE
  }

  if (status !== undefined) {
    if (status >= 500) return SERVER_MESSAGE
    if (status === 401) return 'Tu sesión no es válida o expiró. Inicia sesión de nuevo.'
    if (status === 403) return 'No tienes permiso para realizar esta acción.'
  }

  const data = e.data
  if (data && typeof data === 'object') {
    if (Array.isArray(data.detail)) return VALIDATION_MESSAGE
    if (typeof data.message === 'string' && data.message.trim() && !isTechnical(data.message)) {
      return data.message
    }
  }

  if (status === 404) return 'No se encontró lo solicitado.'
  if (status === 422) return VALIDATION_MESSAGE

  // Error ya normalizado por la app (ApiRequestError: `code` + `message` en español).
  if (e.code && text && !isTechnical(text) && !looksLikeNetwork) return text

  if (status !== undefined && status >= 400) return UNKNOWN_MESSAGE
  return looksLikeNetwork ? NETWORK_MESSAGE : UNKNOWN_MESSAGE
}
