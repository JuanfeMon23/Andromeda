import { computed, reactive, ref, shallowRef, toValue } from 'vue'
import type { MaybeRefOrGetter } from 'vue'
import type {
  SettingDraft, SettingGroup, SettingHistoryItem, SettingHistoryPage, SettingItem,
  SettingsListResponse, SettingUpdateBody, SettingValue
} from '../types/settings'
import {
  REASON_MAX, REASON_MIN, formatSettingValue, parseDraft, readApiError, sameValue,
  settingErrorMessage, toDraft
} from '../utils/settings'

export interface UseSettingsAdminOptions {
  /** `GET /settings`. La app inyecta el fetcher (la capa no conoce HTTP). */
  list: () => Promise<SettingsListResponse>
  /** `GET /settings/{key}/history?page=`. */
  history: (key: string, page: number) => Promise<SettingHistoryPage>
  /** `PUT /settings/{key}`; devuelve el ajuste actualizado. */
  update: (key: string, body: SettingUpdateBody) => Promise<SettingItem>
  /** Permiso de editar ajustes (la app lo calcula con sus permisos). */
  canEdit: MaybeRefOrGetter<boolean>
  /** Permiso de editar los ajustes con `requires_security_permission`. */
  canEditSecurity: MaybeRefOrGetter<boolean>
  /** Mensaje legible de un error; si devuelve vacío se usa el de la capa o el genérico. */
  mapError?: (error: unknown) => string | null | undefined
  /** Avisos al usuario (la app suele pasar `useToast`). */
  notify?: (kind: 'success' | 'warning' | 'error', message: string) => void
  /** Filas por página esperadas del historial (solo si el servidor no la devuelve). */
  historyPageSize?: number
}

const LOAD_ERROR = 'No se pudieron cargar los ajustes.'
const SAVE_ERROR = 'No se pudo guardar el cambio.'
const HISTORY_ERROR = 'No se pudo cargar el historial.'

/**
 * Estado y acciones de la pantalla de ajustes (`UiSettingsPanel`): carga por
 * grupos, borradores por clave, guardado con motivo obligatorio y versión
 * esperada, e historial paginado. Sin HTTP: la app inyecta los fetchers.
 *
 * ```ts
 * const toast = useToast()
 * const admin = useSettingsAdmin({
 *   list: () => api.settings.list(),
 *   history: (key, page) => api.settings.history(key, page),
 *   update: (key, body) => api.settings.update(key, body),
 *   canEdit: () => can('settings.update'),
 *   canEditSecurity: () => can('settings.update_security'),
 *   mapError: toUserMessage,
 *   notify: (kind, message) => toast[kind](message)
 * })
 * // <UiSettingsPanel :admin="admin" />
 * ```
 */
export function useSettingsAdmin(options: UseSettingsAdminOptions) {
  const groups = ref<SettingGroup[]>([])
  const loading = ref(false)
  const loaded = ref(false)
  const loadError = ref<string | null>(null)
  const drafts = reactive<Record<string, SettingDraft>>({})
  const draftErrors = reactive<Record<string, string | null>>({})

  const isEmpty = computed(() => loaded.value && groups.value.every(g => g.settings.length === 0))

  function messageOf(error: unknown, fallback: string): string {
    return options.mapError?.(error) || settingErrorMessage(error) || fallback
  }

  function adopt(next: SettingGroup[]) {
    groups.value = next
    for (const group of next) {
      for (const setting of group.settings) {
        drafts[setting.key] = toDraft(setting)
        draftErrors[setting.key] = null
      }
    }
  }

  async function load() {
    loading.value = true
    loadError.value = null
    try {
      adopt((await options.list()).groups ?? [])
      loaded.value = true
    } catch (error) {
      loadError.value = messageOf(error, LOAD_ERROR)
    } finally {
      loading.value = false
    }
  }

  function find(key: string): SettingItem | undefined {
    for (const group of groups.value) {
      const hit = group.settings.find(s => s.key === key)
      if (hit) return hit
    }
    return undefined
  }

  /** Por qué no se puede editar (`null` si sí se puede). */
  function lockedReason(setting: SettingItem): string | null {
    if (!toValue(options.canEdit)) return 'No tienes permiso para modificar ajustes.'
    if (setting.requires_security_permission && !toValue(options.canEditSecurity)) {
      return 'Solo con permiso de seguridad.'
    }
    return null
  }
  const canEditSetting = (setting: SettingItem) => lockedReason(setting) === null

  function draftOf(setting: SettingItem): SettingDraft {
    return drafts[setting.key] ?? toDraft(setting)
  }

  function setDraft(setting: SettingItem, value: SettingDraft) {
    drafts[setting.key] = value
    draftErrors[setting.key] = null
  }

  /** «Restablecer»: propone el valor por defecto (no guarda hasta confirmar). */
  function resetDraft(setting: SettingItem) {
    setDraft(setting, toDraft(setting, setting.default))
  }

  /** Hay un borrador distinto del valor vigente (un borrador inválido cuenta como cambio). */
  function isDirty(setting: SettingItem): boolean {
    const parsed = parseDraft(setting, draftOf(setting))
    return parsed.ok ? !sameValue(parsed.value, setting.value) : true
  }

  function isDefault(setting: SettingItem): boolean {
    return sameValue(setting.value, setting.default)
  }

  // ----- Guardar con motivo -----
  const saveOpen = ref(false)
  const target = shallowRef<SettingItem | null>(null)
  const pendingValue = ref<SettingValue>('')
  const reason = ref('')
  const reasonError = ref<string | null>(null)
  const saving = ref(false)
  const saveError = ref<string | null>(null)

  const beforeText = computed(() =>
    target.value ? formatSettingValue(target.value.value, target.value.type, target.value.unit) : '')
  const afterText = computed(() =>
    target.value ? formatSettingValue(pendingValue.value, target.value.type, target.value.unit) : '')

  /** Abre la confirmación; si el borrador no es válido, deja el error en la fila. */
  function askSave(setting: SettingItem): boolean {
    if (!canEditSetting(setting)) return false
    const parsed = parseDraft(setting, draftOf(setting))
    if (!parsed.ok) {
      draftErrors[setting.key] = parsed.message
      return false
    }
    if (sameValue(parsed.value, setting.value)) return false
    target.value = setting
    pendingValue.value = parsed.value
    reason.value = ''
    reasonError.value = null
    saveError.value = null
    saveOpen.value = true
    return true
  }

  function validateReason(): boolean {
    const length = reason.value.trim().length
    if (length < REASON_MIN || length > REASON_MAX) {
      reasonError.value = `Escribe un motivo de ${REASON_MIN} a ${REASON_MAX} caracteres.`
      return false
    }
    reasonError.value = null
    return true
  }

  function replace(updated: SettingItem) {
    for (const group of groups.value) {
      const index = group.settings.findIndex(s => s.key === updated.key)
      if (index !== -1) group.settings[index] = updated
    }
    drafts[updated.key] = toDraft(updated)
    draftErrors[updated.key] = null
  }

  async function handleSaveError(error: unknown, setting: SettingItem) {
    if (readApiError(error).code === 'version_conflict') {
      await load()
      const current = find(setting.key)
      saveOpen.value = false
      options.notify?.(
        'warning',
        current
          ? `Otra persona modificó «${current.description}» mientras la editabas. Se cargó el valor vigente (${formatSettingValue(current.value, current.type, current.unit)}); revísalo y vuelve a intentarlo.`
          : 'Otra persona modificó este ajuste. Se cargó el valor vigente; vuelve a intentarlo.'
      )
      return
    }
    saveError.value = settingErrorMessage(error, setting) || options.mapError?.(error) || SAVE_ERROR
  }

  async function confirmSave() {
    const setting = target.value
    if (!setting || saving.value || !validateReason()) return
    saving.value = true
    saveError.value = null
    try {
      const updated = await options.update(setting.key, {
        value: pendingValue.value,
        reason: reason.value.trim(),
        expected_version: setting.version
      })
      replace(updated)
      saveOpen.value = false
      options.notify?.('success', 'Ajuste guardado. Puede tardar hasta 10 s en aplicarse en todas las instancias.')
    } catch (error) {
      await handleSaveError(error, setting)
    } finally {
      saving.value = false
    }
  }

  function cancelSave() {
    saveOpen.value = false
  }

  // ----- Historial -----
  const historyOpen = ref(false)
  const historyTarget = shallowRef<SettingItem | null>(null)
  const historyItems = ref<SettingHistoryItem[]>([])
  const historyPage = ref(1)
  const historyPageSize = ref(options.historyPageSize ?? 20)
  const historyTotal = ref(0)
  const historyLoading = ref(false)
  const historyError = ref<string | null>(null)

  async function loadHistory(page: number) {
    const setting = historyTarget.value
    if (!setting) return
    historyLoading.value = true
    historyError.value = null
    try {
      const result = await options.history(setting.key, page)
      historyItems.value = result.items ?? []
      historyPage.value = result.page ?? page
      historyPageSize.value = result.page_size || historyPageSize.value
      historyTotal.value = result.total ?? 0
    } catch (error) {
      historyError.value = messageOf(error, HISTORY_ERROR)
    } finally {
      historyLoading.value = false
    }
  }

  async function openHistory(setting: SettingItem) {
    historyTarget.value = setting
    historyItems.value = []
    historyTotal.value = 0
    historyPage.value = 1
    historyOpen.value = true
    await loadHistory(1)
  }

  const setHistoryPage = (page: number) => loadHistory(page)

  return reactive({
    groups, loading, loaded, loadError, isEmpty, drafts, draftErrors,
    load, lockedReason, canEditSetting, draftOf, setDraft, resetDraft, isDirty, isDefault,
    saveOpen, target, pendingValue, reason, reasonError, saving, saveError, beforeText, afterText,
    askSave, confirmSave, cancelSave,
    historyOpen, historyTarget, historyItems, historyPage, historyPageSize, historyTotal,
    historyLoading, historyError, openHistory, setHistoryPage
  })
}

export type SettingsAdminState = ReturnType<typeof useSettingsAdmin>
