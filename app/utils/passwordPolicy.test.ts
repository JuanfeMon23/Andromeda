import { describe, expect, it } from 'vitest'
import { passwordPolicyChecks, passwordPolicyIssues, zPassword } from './passwordPolicy'
import type { PasswordPolicy } from './passwordPolicy'

const full: PasswordPolicy = {
  min_length: 12, max_length: 128,
  require_lowercase: true, require_uppercase: true, require_digit: true, require_symbol: true
}

describe('passwordPolicyChecks', () => {
  it('lista todos los requisitos de la política completa', () => {
    expect(passwordPolicyChecks('', full).map(check => check.id)).toEqual(['length', 'lower', 'upper', 'digit', 'symbol'])
  })

  it('omite los requisitos que la política no exige', () => {
    const policy = { ...full, require_symbol: false, require_uppercase: false }
    expect(passwordPolicyChecks('abc', policy).map(check => check.id)).toEqual(['length', 'lower', 'digit'])
  })

  it('cumple cuando la contraseña es fuerte', () => {
    expect(passwordPolicyChecks('Clave-Segura-2026', full).every(check => check.met)).toBe(true)
  })

  it('cuenta la longitud en caracteres, no en unidades UTF-16', () => {
    const policy = { ...full, min_length: 3, max_length: 3 }
    expect(passwordPolicyChecks('😀😀😀', policy)[0]!.met).toBe(true)
  })

  it('respeta mínimo y máximo y los pone en la etiqueta', () => {
    const [len] = passwordPolicyChecks('a'.repeat(129), full)
    expect(len!.met).toBe(false)
    expect(len!.label).toBe('Entre 12 y 128 caracteres')
  })

  it('acepta letras y dígitos Unicode (ñ, Á, ٣)', () => {
    const checks = passwordPolicyChecks('ñÁ٣!', { ...full, min_length: 1 })
    expect(checks.every(check => check.met)).toBe(true)
  })
})

describe('passwordPolicyIssues', () => {
  it('devuelve las etiquetas que faltan', () => {
    expect(passwordPolicyIssues('abcdefghijkl', full)).toEqual([
      'Una letra mayúscula', 'Un número', 'Un símbolo (por ejemplo ! ? - _ . @ #)'
    ])
  })
  it('vacío si cumple', () => {
    expect(passwordPolicyIssues('Clave-Segura-2026', full)).toEqual([])
  })
})

describe('zPassword', () => {
  const schema = zPassword(full)
  it('acepta una contraseña que cumple', () => {
    expect(schema.safeParse('Clave-Segura-2026').success).toBe(true)
  })
  it('vacío → mensaje de obligatoria', () => {
    const result = schema.safeParse('')
    expect(result.success ? null : result.error.issues[0]!.message).toBe('Escribe una contraseña.')
  })
  it('no cumple → mensaje de requisitos', () => {
    const result = schema.safeParse('corta')
    expect(result.success ? null : result.error.issues[0]!.message).toBe('La contraseña aún no cumple todos los requisitos.')
  })
  it('permite mensajes propios', () => {
    const result = zPassword(full, { required: 'Falta', incomplete: 'Débil' }).safeParse('x')
    expect(result.success ? null : result.error.issues[0]!.message).toBe('Débil')
  })
})
