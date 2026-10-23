import { describe, expect, it } from 'vitest'
import {
  describeLastChange, describeRange, formatSettingValue, parseDraft, readApiError, sameValue, settingErrorMessage, toDraft
} from './settings'

const int = { type: 'int' as const, min: 1, max: 10, unit: 's' }

describe('formatSettingValue', () => {
  it('bool → Activado/Desactivado', () => {
    expect(formatSettingValue(true, 'bool')).toBe('Activado')
    expect(formatSettingValue(false, 'bool')).toBe('Desactivado')
  })
  it('número con unidad', () => expect(formatSettingValue(5, 'int', 's')).toBe('5 s'))
  it('texto vacío y nulo', () => {
    expect(formatSettingValue('', 'str')).toBe('(vacío)')
    expect(formatSettingValue(null, 'str')).toBe('—')
  })
})

describe('describeRange', () => {
  it('rango, mínimo, máximo y nada', () => {
    expect(describeRange(1, 10, 's')).toBe('De 1 a 10 s')
    expect(describeRange(1, null)).toBe('Mínimo 1')
    expect(describeRange(null, 5)).toBe('Máximo 5')
    expect(describeRange(null, null)).toBe('')
  })
})

describe('parseDraft', () => {
  it('int válido', () => expect(parseDraft(int, ' 5 ')).toEqual({ ok: true, value: 5 }))
  it('int con decimales', () => expect(parseDraft(int, '2.5')).toMatchObject({ ok: false, message: 'Debe ser un número entero.' }))
  it('fuera de rango muestra el rango', () => {
    expect(parseDraft(int, '11')).toEqual({ ok: false, message: 'Fuera de rango. De 1 a 10 s.' })
    expect(parseDraft(int, '0')).toMatchObject({ ok: false })
  })
  it('vacío y no numérico', () => {
    expect(parseDraft(int, '')).toMatchObject({ ok: false })
    expect(parseDraft(int, 'abc')).toMatchObject({ ok: false, message: 'Debe ser un número.' })
  })
  it('float acepta decimales', () => {
    expect(parseDraft({ type: 'float', min: 0, max: 1, unit: null }, '0.25')).toEqual({ ok: true, value: 0.25 })
  })
  it('bool y str', () => {
    expect(parseDraft({ type: 'bool', min: null, max: null, unit: null }, true)).toEqual({ ok: true, value: true })
    expect(parseDraft({ type: 'str', min: null, max: null, unit: null }, 'hola')).toEqual({ ok: true, value: 'hola' })
  })
})

describe('toDraft / sameValue', () => {
  it('bool boolean, resto texto', () => {
    expect(toDraft({ type: 'bool', value: true })).toBe(true)
    expect(toDraft({ type: 'int', value: 5 })).toBe('5')
  })
  it('compara por valor', () => {
    expect(sameValue(5, '5')).toBe(true)
    expect(sameValue(true, false)).toBe(false)
  })
})

describe('describeLastChange', () => {
  it('vacío sin fecha', () => {
    expect(describeLastChange({ updated_at: null, updated_by: null, updated_by_username: null })).toBe('')
  })
  it('incluye el usuario', () => {
    const text = describeLastChange({ updated_at: '2026-10-20T10:00:00Z', updated_by: 'u1', updated_by_username: 'ana' })
    expect(text).toMatch(/^Última modificación: .+ por ana$/)
  })
})

describe('errores de la API', () => {
  it('lee code/details del error normalizado y de data', () => {
    expect(readApiError({ code: 'version_conflict', details: { current_version: 3 } }).details.current_version).toBe(3)
    expect(readApiError({ data: { code: 'x', message: 'm', details: { a: 1 } } })).toEqual({ code: 'x', message: 'm', details: { a: 1 } })
    expect(readApiError(null).code).toBeNull()
  })
  it('fuera de rango incluye min/max', () => {
    const msg = settingErrorMessage({ code: 'setting_out_of_range', details: { min: 1, max: 9 } }, { unit: 's' })
    expect(msg).toBe('El valor está fuera del rango permitido. De 1 a 9 s.')
  })
  it('otros códigos y desconocido', () => {
    expect(settingErrorMessage({ code: 'setting_not_found' })).toContain('ya no existe')
    expect(settingErrorMessage({ code: 'nope' })).toBeNull()
  })
})
