/**
 * Texto de las páginas de error (`UiErrorPage`). Regla: NUNCA se muestra el
 * mensaje técnico del servidor ni trazas; solo estos textos fijos en español.
 */
export type ErrorIcon = 'search' | 'lock' | 'ban' | 'clock' | 'alert' | 'cloud-off'
/** `home`: ir al inicio · `reload`: reintentar la página actual. */
export type ErrorActionKind = 'home' | 'reload'

export interface ErrorView {
  title: string
  message: string
  hint: string
  icon: ErrorIcon
  primaryAction: { kind: ErrorActionKind, label: string }
}

const GENERIC: ErrorView = {
  title: 'Algo salió mal',
  message: 'Ocurrió un error inesperado.',
  hint: 'Inténtalo de nuevo en unos minutos.',
  icon: 'alert',
  primaryAction: { kind: 'reload', label: 'Reintentar' }
}

const BY_STATUS: Record<number, ErrorView> = {
  404: {
    title: 'No encontramos esta página',
    message: 'Puede que el enlace esté mal escrito o que la página ya no exista.',
    hint: 'Revisa la dirección o vuelve al inicio.',
    icon: 'search',
    primaryAction: { kind: 'home', label: 'Volver al inicio' }
  },
  401: {
    title: 'Tu sesión terminó',
    message: 'Por seguridad cerramos tu sesión.',
    hint: 'Inicia sesión de nuevo para continuar.',
    icon: 'lock',
    primaryAction: { kind: 'home', label: 'Iniciar sesión' }
  },
  403: {
    title: 'Sin acceso',
    message: 'No tienes permiso para ver esta página.',
    hint: 'Si crees que deberías tener acceso, comunícate con un administrador.',
    icon: 'ban',
    primaryAction: { kind: 'home', label: 'Volver al inicio' }
  },
  429: {
    title: 'Demasiadas solicitudes',
    message: 'Hiciste muchas acciones en poco tiempo.',
    hint: 'Espera un momento e inténtalo de nuevo.',
    icon: 'clock',
    primaryAction: { kind: 'reload', label: 'Reintentar' }
  },
  503: {
    title: 'Servicio no disponible',
    message: 'No pudimos conectar con el servicio en este momento.',
    hint: 'Verifica tu conexión e inténtalo de nuevo en unos minutos.',
    icon: 'cloud-off',
    primaryAction: { kind: 'reload', label: 'Reintentar' }
  }
}

/** Vista para un código HTTP; 5xx sin caso propio y desconocidos → genérico. */
export function errorView(statusCode: number | string | undefined | null): ErrorView {
  const view = BY_STATUS[Number(statusCode)] ?? GENERIC
  return { ...view, primaryAction: { ...view.primaryAction } }
}
