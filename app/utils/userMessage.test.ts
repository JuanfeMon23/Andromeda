import { describe, expect, it } from 'vitest'
import { NETWORK_MESSAGE, SERVER_MESSAGE, toUserMessage } from './userMessage'

describe('toUserMessage', () => {
  it('un fallo de red nunca expone el texto crudo del fetch', () => {
    const raw = new Error('[GET] "http://localhost:8001/api/v1/queue?status=pre_recepcion": <no response> Failed to fetch')
    expect(toUserMessage(raw)).toBe(NETWORK_MESSAGE)
    expect(toUserMessage(new TypeError('Failed to fetch'))).toBe(NETWORK_MESSAGE)
    expect(toUserMessage({ name: 'FetchError', message: 'fetch failed' })).toBe(NETWORK_MESSAGE)
    expect(toUserMessage(new Error('NetworkError when attempting to fetch resource.'))).toBe(NETWORK_MESSAGE)
  })

  it('muestra el mensaje de negocio de la API (code/message)', () => {
    const err = {
      status: 409,
      data: { code: 'conflict', message: 'El paciente ya se encuentra en la cola.' }
    }
    expect(toUserMessage(err)).toBe('El paciente ya se encuentra en la cola.')
  })

  it('un 5xx da un mensaje de servidor, no el detalle técnico', () => {
    expect(toUserMessage({ status: 500, data: { detail: 'Traceback (most recent call last)...' } })).toBe(SERVER_MESSAGE)
    expect(toUserMessage({ status: 502, statusText: 'Bad Gateway' })).toBe(SERVER_MESSAGE)
  })

  it('un 422 de schema pide revisar los datos', () => {
    const err = { status: 422, data: { detail: [{ loc: ['body', 'x'], msg: 'field required' }] } }
    expect(toUserMessage(err)).toMatch(/datos/i)
  })

  it('errores de permisos y no encontrado tienen texto propio', () => {
    expect(toUserMessage({ status: 401 })).toMatch(/sesión|autoriz/i)
    expect(toUserMessage({ status: 403 })).toMatch(/permiso/i)
    expect(toUserMessage({ status: 404 })).toMatch(/no se encontr/i)
  })

  it('un mensaje con aspecto técnico de la API se reemplaza', () => {
    const err = { status: 400, data: { code: 'x', message: 'IntegrityError: duplicate key value violates unique constraint' } }
    expect(toUserMessage(err)).not.toMatch(/IntegrityError/)
  })

  it('lo desconocido da un mensaje genérico', () => {
    expect(toUserMessage('boom')).toMatch(/inesperado/i)
    expect(toUserMessage(undefined)).toMatch(/inesperado/i)
  })

  it('acepta un ApiRequestError ya normalizado (code/message/status)', () => {
    const err = Object.assign(new Error('No se pudo establecer conexión con el servidor.'), {
      code: 'network_error'
    })
    expect(toUserMessage(err)).toBe('No se pudo establecer conexión con el servidor.')
  })

  it('timeout', () => {
    expect(toUserMessage({ name: 'TimeoutError', message: 'timeout' })).toMatch(/tard/i)
  })
})
