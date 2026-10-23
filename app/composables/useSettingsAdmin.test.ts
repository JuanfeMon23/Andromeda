import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { useSettingsAdmin } from './useSettingsAdmin'
import type { SettingItem, SettingsListResponse } from '../types/settings'

function setting(over: Partial<SettingItem> = {}): SettingItem {
  return {
    key: 'login.max_attempts', type: 'int', value: 5, default: 5, min: 1, max: 10, unit: null,
    description: 'Intentos de inicio de sesión', version: 1, requires_security_permission: false,
    updated_at: null, updated_by: null, updated_by_username: null, ...over
  }
}
const list = (items: SettingItem[]): SettingsListResponse => ({ groups: [{ group: 'Seguridad', settings: items }] })

function build(over: Record<string, unknown> = {}, items = [setting()]) {
  const notify = vi.fn()
  const update = vi.fn(async (_k: string, body: { value: number | boolean | string }) => ({ ...items[0]!, value: body.value, version: 2 }))
  const admin = useSettingsAdmin({
    list: async () => list(items),
    history: async (_k: string, page: number) => ({ items: [], page, page_size: 20, total: 0 }),
    update,
    canEdit: true,
    canEditSecurity: false,
    notify,
    ...over
  } as never)
  return { admin, notify, update }
}

describe('useSettingsAdmin', () => {
  it('load() carga grupos y borradores', async () => {
    const { admin } = build()
    await admin.load()
    expect(admin.loaded).toBe(true)
    expect(admin.groups[0]!.settings).toHaveLength(1)
    expect(admin.drafts['login.max_attempts']).toBe('5')
  })

  it('load() con error deja un mensaje legible (mapError)', async () => {
    const { admin } = build({ list: async () => { throw new Error('boom') }, mapError: () => 'No hay conexión.' })
    await admin.load()
    expect(admin.loadError).toBe('No hay conexión.')
  })

  it('isEmpty cuando no hay ajustes', async () => {
    const { admin } = build({ list: async () => ({ groups: [] }) })
    await admin.load()
    expect(admin.isEmpty).toBe(true)
  })

  it('permisos: sin canEdit o sin seguridad bloquea', async () => {
    const { admin } = build({ canEdit: false })
    await admin.load()
    expect(admin.lockedReason(admin.groups[0]!.settings[0]!)).toContain('permiso')
    const sec = build({}, [setting({ requires_security_permission: true })])
    await sec.admin.load()
    expect(sec.admin.lockedReason(sec.admin.groups[0]!.settings[0]!)).toBe('Solo con permiso de seguridad.')
    expect(sec.admin.askSave(sec.admin.groups[0]!.settings[0]!)).toBe(false)
  })

  it('acepta permisos reactivos', async () => {
    const security = ref(false)
    const { admin } = build({ canEditSecurity: security }, [setting({ requires_security_permission: true })])
    await admin.load()
    const s = admin.groups[0]!.settings[0]!
    expect(admin.canEditSetting(s)).toBe(false)
    security.value = true
    expect(admin.canEditSetting(s)).toBe(true)
  })

  it('resetDraft propone el default sin guardar', async () => {
    const { admin, update } = build({}, [setting({ value: 8, default: 5 })])
    await admin.load()
    const s = admin.groups[0]!.settings[0]!
    admin.resetDraft(s)
    expect(admin.draftOf(s)).toBe('5')
    expect(admin.isDirty(s)).toBe(true)
    expect(update).not.toHaveBeenCalled()
  })

  it('askSave: sin cambios no abre; inválido marca error; válido abre con antes y después', async () => {
    const { admin } = build()
    await admin.load()
    const s = admin.groups[0]!.settings[0]!
    expect(admin.askSave(s)).toBe(false)
    admin.setDraft(s, '99')
    expect(admin.askSave(s)).toBe(false)
    expect(admin.draftErrors[s.key]).toContain('Fuera de rango')
    admin.setDraft(s, '7')
    expect(admin.askSave(s)).toBe(true)
    expect(admin.saveOpen).toBe(true)
    expect(admin.beforeText).toBe('5')
    expect(admin.afterText).toBe('7')
  })

  it('confirmSave exige motivo de 3 a 500', async () => {
    const { admin, update } = build()
    await admin.load()
    const s = admin.groups[0]!.settings[0]!
    admin.setDraft(s, '7'); admin.askSave(s)
    admin.reason = 'ab'
    await admin.confirmSave()
    expect(admin.reasonError).toBeTruthy()
    admin.reason = 'x'.repeat(501)
    await admin.confirmSave()
    expect(admin.reasonError).toBeTruthy()
    expect(update).not.toHaveBeenCalled()
  })

  it('confirmSave guarda con expected_version, actualiza y avisa', async () => {
    const { admin, update, notify } = build()
    await admin.load()
    const s = admin.groups[0]!.settings[0]!
    admin.setDraft(s, '7'); admin.askSave(s)
    admin.reason = '  Más tolerancia  '
    await admin.confirmSave()
    expect(update).toHaveBeenCalledWith('login.max_attempts', { value: 7, reason: 'Más tolerancia', expected_version: 1 })
    expect(admin.saveOpen).toBe(false)
    expect(admin.groups[0]!.settings[0]!.value).toBe(7)
    expect(admin.drafts['login.max_attempts']).toBe('7')
    expect(notify).toHaveBeenCalledWith('success', expect.stringContaining('10 s'))
  })

  it('409 recarga el valor vigente, cierra y avisa', async () => {
    const { admin, notify } = build({
      update: async () => { throw { code: 'version_conflict', details: { current_version: 2 } } }
    })
    await admin.load()
    const s = admin.groups[0]!.settings[0]!
    admin.setDraft(s, '7'); admin.askSave(s); admin.reason = 'motivo'
    await admin.confirmSave()
    expect(admin.saveOpen).toBe(false)
    expect(notify).toHaveBeenCalledWith('warning', expect.stringContaining('valor vigente'))
    expect(admin.drafts['login.max_attempts']).toBe('5')
  })

  it('422 fuera de rango deja el modal abierto con el rango', async () => {
    const { admin } = build({
      update: async () => { throw { code: 'setting_out_of_range', details: { min: 1, max: 10 } } }
    })
    await admin.load()
    const s = admin.groups[0]!.settings[0]!
    admin.setDraft(s, '7'); admin.askSave(s); admin.reason = 'motivo'
    await admin.confirmSave()
    expect(admin.saveOpen).toBe(true)
    expect(admin.saveError).toContain('De 1 a 10')
    expect(admin.saving).toBe(false)
  })

  it('error desconocido usa mapError', async () => {
    const { admin } = build({ update: async () => { throw new Error('x') }, mapError: () => 'Sin conexión.' })
    await admin.load()
    const s = admin.groups[0]!.settings[0]!
    admin.setDraft(s, '7'); admin.askSave(s); admin.reason = 'motivo'
    await admin.confirmSave()
    expect(admin.saveError).toBe('Sin conexión.')
  })

  it('historial: abre, pagina y maneja errores', async () => {
    const history = vi.fn(async (_k: string, page: number) => ({
      items: [{ id: page, setting_key: 'k', old_value: 1, new_value: 2, version_after: 2, changed_by: null, changed_by_username: 'ana', changed_at: '2026-10-20T10:00:00Z', reason: 'r', request_id: null }],
      page, page_size: 1, total: 3
    }))
    const { admin } = build({ history })
    await admin.load()
    await admin.openHistory(admin.groups[0]!.settings[0]!)
    expect(admin.historyOpen).toBe(true)
    expect(admin.historyTotal).toBe(3)
    await admin.setHistoryPage(2)
    expect(history).toHaveBeenLastCalledWith('login.max_attempts', 2)
    expect(admin.historyPage).toBe(2)

    const failing = build({ history: async () => { throw new Error('x') }, mapError: () => 'Falló.' })
    await failing.admin.load()
    await failing.admin.openHistory(failing.admin.groups[0]!.settings[0]!)
    expect(failing.admin.historyError).toBe('Falló.')
  })
})
