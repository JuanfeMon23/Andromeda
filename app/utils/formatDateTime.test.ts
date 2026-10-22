import { describe, expect, it } from 'vitest'
import { formatDateTime } from './formatDateTime'

describe('formatDateTime', () => {
  it('formatea un ISO en es-CO con fecha y hora', () => {
    const out = formatDateTime('2026-03-05T15:30:00')
    expect(out).toMatch(/2026/)
    expect(out).toContain("5/03/2026")
    expect(out).toMatch(/\d{1,2}:30/)
  })

  it('acepta Date', () => {
    expect(formatDateTime(new Date(2026, 0, 2, 9, 5))).toMatch(/2026/)
  })

  it('un texto que no es fecha se devuelve tal cual; vacío/null -> vacío', () => {
    expect(formatDateTime('no-es-fecha')).toBe('no-es-fecha')
    expect(formatDateTime(null)).toBe('')
    expect(formatDateTime(undefined)).toBe('')
    expect(formatDateTime('')).toBe('')
  })
})
