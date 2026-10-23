import { describe, expect, it } from 'vitest'
import { DEFAULT_WAIT_SECONDS, remainingSeconds } from './countdown'

describe('remainingSeconds', () => {
  it('redondea hacia arriba', () => {
    expect(remainingSeconds(10_500, 10_000)).toBe(1)
    expect(remainingSeconds(12_000, 10_000)).toBe(2)
  })
  it('nunca es negativo', () => {
    expect(remainingSeconds(5_000, 10_000)).toBe(0)
  })
  it('espera por defecto de 60 s', () => {
    expect(DEFAULT_WAIT_SECONDS).toBe(60)
  })
})
