import { describe, expect, it } from 'vitest'
import { DEFAULT_DURATION, MAX_TOASTS, addToast, dismissToast } from './toasts'

describe('toasts', () => {
  it('addToast agrega con id, variante y duración por defecto', () => {
    const { list, toast } = addToast([], { message: 'Guardado', variant: 'success' })
    expect(list).toHaveLength(1)
    expect(toast.id).toBeTruthy()
    expect(toast.variant).toBe('success')
    expect(toast.duration).toBe(DEFAULT_DURATION.success)
  })

  it('los errores duran más que los éxitos', () => {
    expect(DEFAULT_DURATION.danger).toBeGreaterThan(DEFAULT_DURATION.success)
  })

  it('duration 0 significa persistente', () => {
    const { toast } = addToast([], { message: 'x', variant: 'info', duration: 0 })
    expect(toast.duration).toBe(0)
  })

  it('limita la cantidad visible descartando las más antiguas', () => {
    let list: ReturnType<typeof addToast>['list'] = []
    for (let i = 0; i < MAX_TOASTS + 3; i++) {
      list = addToast(list, { message: `m${i}`, variant: 'info' }).list
    }
    expect(list).toHaveLength(MAX_TOASTS)
    expect(list[list.length - 1]!.message).toBe(`m${MAX_TOASTS + 2}`)
  })

  it('un mensaje idéntico y reciente no se duplica', () => {
    const first = addToast([], { message: 'Error de red', variant: 'danger' })
    const second = addToast(first.list, { message: 'Error de red', variant: 'danger' })
    expect(second.list).toHaveLength(1)
    expect(second.toast.id).toBe(first.toast.id)
  })

  it('dismissToast quita por id', () => {
    const { list, toast } = addToast([], { message: 'a', variant: 'info' })
    expect(dismissToast(list, toast.id)).toEqual([])
    expect(dismissToast(list, 'otro')).toHaveLength(1)
  })
})
