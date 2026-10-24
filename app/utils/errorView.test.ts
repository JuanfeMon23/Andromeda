import { describe, expect, it } from 'vitest'
import { errorView } from './errorView'

describe('errorView', () => {
  it.each([
    [404, 'No encontramos esta página', 'search', 'home'],
    [401, 'Tu sesión terminó', 'lock', 'home'],
    [403, 'Sin acceso', 'ban', 'home'],
    [429, 'Demasiadas solicitudes', 'clock', 'reload'],
    [503, 'Servicio no disponible', 'cloud-off', 'reload'],
    [500, 'Algo salió mal', 'alert', 'reload'],
    [502, 'Algo salió mal', 'alert', 'reload']
  ])('%s', (code, title, icon, kind) => {
    const v = errorView(code)
    expect(v.title).toBe(title)
    expect(v.icon).toBe(icon)
    expect(v.primaryAction.kind).toBe(kind)
    expect(v.message && v.hint && v.primaryAction.label).toBeTruthy()
  })

  it.each([undefined, null, 0, 418, Number.NaN, 'abc'])('desconocido %s -> genérico', (code) => {
    expect(errorView(code as number).title).toBe('Algo salió mal')
  })

  it('acepta código numérico como texto', () => {
    expect(errorView('404').title).toBe('No encontramos esta página')
  })

  it('no filtra texto técnico y devuelve copias independientes', () => {
    for (const code of [404, 401, 403, 429, 500, 503, undefined]) {
      const text = JSON.stringify(errorView(code))
      expect(text).not.toMatch(/traceback|stack|fetch|sql|http|\[GET\]|exception/i)
    }
    errorView(404).primaryAction.label = 'x'
    expect(errorView(404).primaryAction.label).toBe('Volver al inicio')
  })
})
