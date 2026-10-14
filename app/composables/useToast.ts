import { addToast, dismissToast } from '../utils/toasts'
import type { Toast, ToastVariant } from '../utils/toasts'

export type { Toast, ToastVariant }

interface ToastOptions {
  title?: string
  /** Milisegundos; `0` = no se cierra solo. */
  duration?: number
}

/**
 * Notificaciones globales. Se renderizan con `<UiToaster />` (una vez, en app.vue).
 *
 * @example
 * const toast = useToast()
 * toast.success('Orden generada')
 * toast.error(apiErrorMessage(e))
 */
export function useToast() {
  const toasts = useState<Toast[]>('andromeda-toasts', () => [])
  const timers = new Map<string, ReturnType<typeof setTimeout>>()

  function dismiss(id: string) {
    const timer = timers.get(id)
    if (timer) clearTimeout(timer)
    timers.delete(id)
    toasts.value = dismissToast(toasts.value, id)
  }

  function show(variant: ToastVariant, message: string, options: ToastOptions = {}) {
    const { list, toast } = addToast(toasts.value, { message, variant, ...options })
    toasts.value = list
    if (import.meta.client && toast.duration > 0 && !timers.has(toast.id)) {
      timers.set(toast.id, setTimeout(() => dismiss(toast.id), toast.duration))
    }
    return toast.id
  }

  return {
    toasts,
    dismiss,
    show,
    success: (message: string, options?: ToastOptions) => show('success', message, options),
    error: (message: string, options?: ToastOptions) => show('danger', message, options),
    warning: (message: string, options?: ToastOptions) => show('warning', message, options),
    info: (message: string, options?: ToastOptions) => show('info', message, options)
  }
}
