import { describe, expect, it, vi } from 'vitest'
import { openEntityFromQuery, useEntityModal } from './useEntityModal'

interface Row { id: string }

describe('useEntityModal', () => {
  it('arranca cerrado y sin entidad', () => {
    const modal = useEntityModal<Row>()
    expect(modal.open).toBe(false)
    expect(modal.entity).toBeNull()
  })

  it('openCreate abre sin entidad (aunque hubiera una)', () => {
    const modal = useEntityModal<Row>()
    modal.openEdit({ id: '1' })
    modal.openCreate()
    expect(modal.open).toBe(true)
    expect(modal.entity).toBeNull()
  })

  it('openEdit abre con la entidad y close cierra', () => {
    const modal = useEntityModal<Row>()
    modal.openEdit({ id: '1' })
    expect(modal.open).toBe(true)
    expect(modal.entity).toEqual({ id: '1' })
    modal.close()
    expect(modal.open).toBe(false)
  })
})

describe('openEntityFromQuery', () => {
  it('abre la entidad del parámetro y lo quita de la URL conservando el resto', async () => {
    const modal = useEntityModal<Row>()
    const replaceQuery = vi.fn()
    const opened = await openEntityFromQuery({
      query: { open: '7', q: 'a' }, modal, get: async id => ({ id }), replaceQuery
    })
    expect(opened).toBe(true)
    expect(replaceQuery).toHaveBeenCalledWith({ q: 'a' })
    expect(modal.entity).toEqual({ id: '7' })
    expect(modal.open).toBe(true)
  })

  it('respeta una clave propia', async () => {
    const modal = useEntityModal<Row>()
    const replaceQuery = vi.fn()
    await openEntityFromQuery({ query: { edit: '3' }, key: 'edit', modal, get: async id => ({ id }), replaceQuery })
    expect(modal.entity).toEqual({ id: '3' })
    expect(replaceQuery).toHaveBeenCalledWith({})
  })

  it('sin parámetro (o vacío) no hace nada', async () => {
    const modal = useEntityModal<Row>()
    const get = vi.fn(async (id: string) => ({ id }))
    const replaceQuery = vi.fn()
    expect(await openEntityFromQuery({ query: {}, modal, get, replaceQuery })).toBe(false)
    expect(await openEntityFromQuery({ query: { open: '' }, modal, get, replaceQuery })).toBe(false)
    expect(get).not.toHaveBeenCalled()
    expect(replaceQuery).not.toHaveBeenCalled()
  })

  it('si la entidad ya no existe quita el parámetro y deja el modal cerrado', async () => {
    const modal = useEntityModal<Row>()
    const replaceQuery = vi.fn()
    const opened = await openEntityFromQuery({
      query: { open: '9' }, modal, get: async () => { throw new Error('404') }, replaceQuery
    })
    expect(opened).toBe(false)
    expect(replaceQuery).toHaveBeenCalledWith({})
    expect(modal.open).toBe(false)
  })
})
