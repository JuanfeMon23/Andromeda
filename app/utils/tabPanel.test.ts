import { describe, expect, it } from 'vitest'
import { shouldRenderPanel } from './tabPanel'

describe('shouldRenderPanel', () => {
  const visited = new Set(['a', 'b'])
  it('normal: monta los visitados', () => {
    expect(shouldRenderPanel('a', 'b', visited)).toBe(true)
    expect(shouldRenderPanel('c', 'b', visited)).toBe(false)
  })
  it('lazy: solo el activo (los visitados se desmontan)', () => {
    expect(shouldRenderPanel('b', 'b', visited, true)).toBe(true)
    expect(shouldRenderPanel('a', 'b', visited, true)).toBe(false)
  })
})
