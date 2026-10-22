import { describe, expect, it, vi } from 'vitest'
import { nextTick, ref } from 'vue'
import type { ActivityFetcher } from '../types/activity'
import { useActivity } from './useActivity'

function event(id: string, action: 'activated' | 'deactivated' = 'deactivated') {
  return { id, entity_type: 'units', entity_id: 'u1', action, reason: null, occurred_at: '2026-10-02T10:00:00Z' }
}

const flush = async () => {
  for (let i = 0; i < 4; i++) await nextTick()
  await new Promise(resolve => setTimeout(resolve, 0))
}

describe('useActivity', () => {
  it('carga la primera página del historial de la entidad', async () => {
    const fetcher = vi.fn<ActivityFetcher>(async () => ({ items: [event('e1')], total: 1 }))
    const activity = useActivity('units', 'u1', { fetcher })
    await flush()
    expect(fetcher).toHaveBeenCalledWith({ entityType: 'units', entityId: 'u1', page: 1, pageSize: 20 })
    expect(activity.events.map(e => e.id)).toEqual(['e1'])
    expect(activity.total).toBe(1)
    expect(activity.hasMore).toBe(false)
    expect(activity.loading).toBe(false)
  })

  it('loadMore() agrega la página siguiente', async () => {
    const fetcher = vi.fn<ActivityFetcher>()
      .mockResolvedValueOnce({ items: [event('e1')], total: 2 })
      .mockResolvedValueOnce({ items: [event('e2', 'activated')], total: 2 })
    const activity = useActivity('units', 'u1', { fetcher, pageSize: 1 })
    await flush()
    expect(activity.hasMore).toBe(true)
    await activity.loadMore()
    expect(fetcher).toHaveBeenLastCalledWith({ entityType: 'units', entityId: 'u1', page: 2, pageSize: 1 })
    expect(activity.events.map(e => e.id)).toEqual(['e1', 'e2'])
    expect(activity.hasMore).toBe(false)
  })

  it('sin id no consulta y al recibir uno carga', async () => {
    const fetcher = vi.fn<ActivityFetcher>(async () => ({ items: [], total: 0 }))
    const id = ref<string | null>(null)
    const activity = useActivity('staff', id, { fetcher })
    await flush()
    expect(fetcher).not.toHaveBeenCalled()
    expect(activity.events).toEqual([])
    id.value = 's1'
    await flush()
    expect(fetcher).toHaveBeenCalledTimes(1)
  })

  it('un error deja un mensaje legible (mapError o el del error)', async () => {
    const failing: ActivityFetcher = () => Promise.reject(new Error('No existe.'))
    const plain = useActivity('units', 'u1', { fetcher: failing })
    await flush()
    expect(plain.error).toBe('No existe.')
    expect(plain.loading).toBe(false)

    const mapped = useActivity('units', 'u1', { fetcher: failing, mapError: () => 'Sin conexión.' })
    await flush()
    expect(mapped.error).toBe('Sin conexión.')
  })

  it('sin fetcher configurado informa en vez de fallar', async () => {
    const activity = useActivity('units', 'u1')
    await flush()
    expect(activity.error).toMatch(/configur/i)
  })
})
