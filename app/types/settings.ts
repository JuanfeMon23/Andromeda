/** Contrato HTTP de la pantalla de ajustes (módulo `settings_store` de Leo). */
export type SettingType = 'int' | 'float' | 'bool' | 'str'
export type SettingValue = number | boolean | string

export interface SettingItem {
  key: string
  type: SettingType
  value: SettingValue
  default: SettingValue
  min: number | null
  max: number | null
  unit: string | null
  description: string
  version: number
  requires_security_permission: boolean
  updated_at: string | null
  updated_by: string | null
  updated_by_username: string | null
}

export interface SettingGroup {
  group: string
  settings: SettingItem[]
}

export interface SettingsListResponse {
  groups: SettingGroup[]
}

export interface SettingHistoryItem {
  id: string | number
  setting_key: string
  old_value: unknown
  new_value: unknown
  version_after: number
  changed_by: string | null
  changed_by_username: string | null
  changed_at: string
  reason: string | null
  request_id: string | null
}

export interface SettingHistoryPage {
  items: SettingHistoryItem[]
  page: number
  page_size: number
  total: number
}

export interface SettingUpdateBody {
  value: SettingValue
  reason: string
  expected_version: number
}

/** Borrador en edición: booleano para `bool`, texto para el resto. */
export type SettingDraft = boolean | string
