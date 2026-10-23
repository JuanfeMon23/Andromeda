import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCountdown } from './useCountdown'

describe('useCountdown', () => {
  beforeEach(() => { vi.useFakeTimers() })
  afterEach(() => { vi.useRealTimers() })

  it('cuenta hacia atrás y llega a 0', () => {
    const c = useCountdown()
    c.start(3)
    expect(c.secondsLeft.value).toBe(3)
    vi.advanceTimersByTime(2000)
    expect(c.secondsLeft.value).toBe(1)
    vi.advanceTimersByTime(5000)
    expect(c.secondsLeft.value).toBe(0)
  })

  it('start(null) usa la espera por defecto', () => {
    const c = useCountdown()
    c.start(null)
    expect(c.secondsLeft.value).toBe(60)
  })

  it('stop() la deja en 0', () => {
    const c = useCountdown()
    c.start(10)
    c.stop()
    expect(c.secondsLeft.value).toBe(0)
  })
})
