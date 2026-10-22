import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { OBJECT_URL_TTL_MS, downloadBlob, openBlobInTab, safeDownloadName } from './downloadBlob'

describe('safeDownloadName', () => {
  it('quita separadores de ruta, control y puntos iniciales', () => {
    expect(safeDownloadName('../a/b\\c.pdf')).toBe('a-b-c.pdf')
    expect(safeDownloadName('x\u0000y.pdf')).toBe('xy.pdf')
    expect(safeDownloadName('  ')).toBe('descarga')
  })
})

describe('downloadBlob / openBlobInTab', () => {
  const link = { click: vi.fn(), remove: vi.fn(), style: {} as Record<string, string>, href: '', download: '', rel: '' }
  const open = vi.fn()
  const revoke = vi.fn()

  beforeEach(() => {
    vi.useFakeTimers()
    link.click.mockClear()
    revoke.mockClear()
    open.mockReset()
    vi.stubGlobal('document', { createElement: () => link, body: { appendChild: vi.fn() } })
    vi.stubGlobal('window', { open })
    vi.stubGlobal('URL', { createObjectURL: vi.fn(() => 'blob:x'), revokeObjectURL: revoke })
  })
  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  it('downloadBlob descarga con nombre seguro y revoca la URL', () => {
    downloadBlob(new Blob(['a']), '../informe.pdf')
    expect(link.download).toBe('informe.pdf')
    expect(link.click).toHaveBeenCalledOnce()
    vi.advanceTimersByTime(1000)
    expect(revoke).toHaveBeenCalledWith('blob:x')
  })

  it('openBlobInTab abre la pestaña y revoca tras el TTL', () => {
    open.mockReturnValue({})
    openBlobInTab(new Blob(['a']), 'a.pdf')
    expect(open).toHaveBeenCalledWith('blob:x', '_blank')
    expect(revoke).not.toHaveBeenCalled()
    vi.advanceTimersByTime(OBJECT_URL_TTL_MS)
    expect(revoke).toHaveBeenCalledWith('blob:x')
  })

  it('si el navegador bloquea la pestaña, descarga el archivo', () => {
    open.mockReturnValue(null)
    openBlobInTab(new Blob(['a']), 'a.pdf')
    expect(revoke).toHaveBeenCalledWith('blob:x')
    expect(link.download).toBe('a.pdf')
    expect(link.click).toHaveBeenCalledOnce()
  })
})
