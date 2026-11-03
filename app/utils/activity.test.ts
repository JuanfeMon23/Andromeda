import { describe, expect, it } from 'vitest'
import { ACTIVITY_ACTION_LABELS, activityActorLabel, withActivityReason, zActivityReason } from './activity'

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

describe('activityActorLabel', () => {
  const ev = { id: '1', entity_type: 'a', entity_id: 'b', action: 'activated' as const, reason: null, occurred_at: 'x' }

  it('con actor_username devuelve "por <nombre>"', () => {
    expect(activityActorLabel({ ...ev, actor_user_id: 'u', actor_username: 'jperez' })).toBe('por jperez')
  })

  it('sin actor (null, vacío o ausente) devuelve null', () => {
    expect(activityActorLabel({ ...ev, actor_username: null })).toBeNull()
    expect(activityActorLabel({ ...ev, actor_username: '' })).toBeNull()
    expect(activityActorLabel(ev)).toBeNull()
  })
})
