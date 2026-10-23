import { z } from 'zod'

/**
 * Política de contraseña (misma forma que la que publica el backend). La
 * capa solo la anticipa en el cliente; el backend sigue siendo la autoridad.
 */
export interface PasswordPolicy {
  min_length: number
  max_length: number
  require_lowercase: boolean
  require_uppercase: boolean
  require_digit: boolean
  require_symbol: boolean
}

export type PasswordCheckId = 'length' | 'lower' | 'upper' | 'digit' | 'symbol'

export interface PasswordCheck {
  id: PasswordCheckId
  label: string
  met: boolean
}

export const PASSWORD_POLICY_INCOMPLETE = 'La contraseña aún no cumple todos los requisitos.'

/**
 * Requisitos aplicables según la política y si `password` los cumple. Solo
 * aparecen los que la política exige (el de longitud siempre). La longitud se
 * cuenta en caracteres (puntos de código), no en unidades UTF-16.
 */
export function passwordPolicyChecks(password: string, policy: PasswordPolicy): PasswordCheck[] {
  const value = password ?? ''
  const length = [...value].length
  const checks: PasswordCheck[] = [
    {
      id: 'length',
      label: `Entre ${policy.min_length} y ${policy.max_length} caracteres`,
      met: length >= policy.min_length && length <= policy.max_length
    }
  ]
  if (policy.require_lowercase) checks.push({ id: 'lower', label: 'Una letra minúscula', met: /\p{Ll}/u.test(value) })
  if (policy.require_uppercase) checks.push({ id: 'upper', label: 'Una letra mayúscula', met: /\p{Lu}/u.test(value) })
  if (policy.require_digit) checks.push({ id: 'digit', label: 'Un número', met: /\p{Nd}/u.test(value) })
  if (policy.require_symbol) {
    checks.push({ id: 'symbol', label: 'Un símbolo (por ejemplo ! ? - _ . @ #)', met: /[^\p{L}\p{N}]/u.test(value) })
  }
  return checks
}

/** Etiquetas de los requisitos que faltan; `[]` si la contraseña cumple la política. */
export function passwordPolicyIssues(password: string, policy: PasswordPolicy): string[] {
  return passwordPolicyChecks(password, policy).filter(c => !c.met).map(c => c.label)
}

export interface ZPasswordMessages {
  required?: string
  incomplete?: string
}

/**
 * Campo zod de contraseña nueva: obligatoria y que cumpla la política.
 * No recorta espacios (forman parte de la contraseña).
 */
export function zPassword(policy: PasswordPolicy, messages: ZPasswordMessages = {}) {
  const required = messages.required ?? 'Escribe una contraseña.'
  return z
    .string({ required_error: required, invalid_type_error: required })
    .min(1, required)
    .refine(value => passwordPolicyIssues(value, policy).length === 0, messages.incomplete ?? PASSWORD_POLICY_INCOMPLETE)
}
