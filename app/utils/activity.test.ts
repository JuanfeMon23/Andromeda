import { describe, expect, it } from 'vitest'
import { ACTIVITY_ACTION_LABELS, withActivityReason, zActivityReason } from './activity'

describe('withActivityReason', () => {
  it('al crear (sin estado inicial) quita el motivo', () => {
    expect(withActivityReason({ name: 'A', is_active: true, activity_reason: 'x' }, undefined))
      .toEqual({ name: 'A', is_active: true })
  })
  it('al editar sin cambiar el estado quita el motivo', () => {
    expect(withActivityReason({ is_active: true, activity_reason: 'x' }, true)).toEqual({ is_active: true })
  })
  it('al editar cambiando el estado conserva el motivo', () => {
    expect(withActivityReason({ is_active: false, activity_reason: 'baja' }, true))
      .toEqual({ is_active: false, activity_reason: 'baja' })
  })
})

describe('activity', () => {
  it('etiquetas en español y motivo opcional ≤ 255', () => {
    expect(ACTIVITY_ACTION_LABELS.activated).toBe('Activado')
    expect(zActivityReason().safeParse('x'.repeat(256)).success).toBe(false)
    expect(zActivityReason().safeParse('').success).toBe(true)
  })
})
