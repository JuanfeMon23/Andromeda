import { describe, expect, it } from 'vitest'
import { useConfirmAction } from './useConfirmAction'

describe('useConfirmAction', () => {
  it('confirm() ejecuta la acción con el objetivo y cierra el modal', async () => {
    const done: string[] = []
    const action = useConfirmAction(async (id: string) => { done.push(id) })
    action.ask('v1')
    expect(action.open).toBe(true)
    await action.confirm()
    expect(done).toEqual(['v1'])
    expect(action.open).toBe(false)
    expect(action.error).toBeNull()
    expect(action.errorCause).toBeNull()
  })

  it('si falla deja el modal abierto con el mensaje y el error original (errorCause)', async () => {
    const failure = Object.assign(new Error('No se puede retirar la versión.'), {
      details: { lab_test_codes: ['GLU'] }
    })
    const action = useConfirmAction(async () => { throw failure })
    action.ask('v1')
    await action.confirm()
    expect(action.open).toBe(true)
    expect(action.error).toBe('No se puede retirar la versión.')
    expect(action.errorCause).toBe(failure)

    // Volver a pedir la confirmación limpia el error.
    action.ask('v2')
    expect(action.error).toBeNull()
    expect(action.errorCause).toBeNull()
  })

  it('mapError traduce el error; si no devuelve nada, cae al mensaje del error y luego al genérico', async () => {
    const mapped = useConfirmAction(async () => { throw new Error('raw') }, { mapError: () => 'Legible.' })
    mapped.ask('x')
    await mapped.confirm()
    expect(mapped.error).toBe('Legible.')

    const fallthrough = useConfirmAction(async () => { throw new Error('raw') }, { mapError: () => null })
    fallthrough.ask('x')
    await fallthrough.confirm()
    expect(fallthrough.error).toBe('raw')

    const generic = useConfirmAction(async () => { throw 'boom' }, { errorMessage: 'Falló.' })
    generic.ask('x')
    await generic.confirm()
    expect(generic.error).toBe('Falló.')
  })
})
