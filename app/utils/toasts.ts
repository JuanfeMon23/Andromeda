/**
 * Lógica pura de las notificaciones (toasts): sin Vue ni Nuxt, para poder
 * probarla con Vitest simple. El estado reactivo vive en `useToast`.
 */
export type ToastVariant = 'success' | 'danger' | 'warning' | 'info'

export interface Toast {
  id: string
  message: string
  title?: string
  variant: ToastVariant
  /** Milisegundos hasta cerrarse solo; `0` = persistente. */
  duration: number
  createdAt: number
}

export interface ToastInput {
  message: string
  variant: ToastVariant
  title?: string
  duration?: number
}

/** Los errores permanecen más tiempo para que se alcancen a leer. */
export const DEFAULT_DURATION: Record<ToastVariant, number> = {
  success: 3500,
  info: 4500,
  warning: 6000,
  danger: 8000
}

export const MAX_TOASTS = 4

let counter = 0

export function addToast(
  list: Toast[],
  input: ToastInput,
  now = Date.now()
): { list: Toast[]; toast: Toast } {
  // Un mensaje idéntico y todavía visible no se duplica (p. ej. reintentos).
  const duplicate = list.find((t) => t.message === input.message && t.variant === input.variant)
  if (duplicate) return { list, toast: duplicate }

  counter += 1
  const toast: Toast = {
    id: `toast-${now}-${counter}`,
    message: input.message,
    title: input.title,
    variant: input.variant,
    duration: input.duration ?? DEFAULT_DURATION[input.variant],
    createdAt: now
  }
  const next = [...list, toast]
  return { list: next.length > MAX_TOASTS ? next.slice(next.length - MAX_TOASTS) : next, toast }
}

export function dismissToast(list: Toast[], id: string): Toast[] {
  return list.filter((t) => t.id !== id)
}
