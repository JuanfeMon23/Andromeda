<script setup lang="ts">
/**
 * Pantalla de ajustes del sistema (módulo `settings_store` de Leo). Un grupo
 * por tarjeta; cada ajuste es una fila con su valor editable según el tipo,
 * el valor por defecto («Restablecer» solo lo propone), quién lo cambió por
 * última vez e historial. Guardar abre un modal que pide el motivo y muestra
 * «antes → después». Todo el estado y las llamadas viven en `useSettingsAdmin`
 * (la capa no conoce HTTP): la app crea el composable y se lo pasa en `admin`.
 *
 * Slot `#empty`: contenido cuando no hay ajustes.
 */
import type { SettingItem } from '../../types/settings'
import type { SettingsAdminState } from '../../composables/useSettingsAdmin'
import { REASON_MAX, REASON_MIN, SETTINGS_PROPAGATION_NOTICE, describeLastChange, describeRange, formatSettingValue } from '../../utils/settings'
import { formatDateTime } from '../../utils/formatDateTime'

const props = withDefaults(
  defineProps<{
    admin: SettingsAdminState
    title?: string
    description?: string
    /** Carga los ajustes al montar. */
    autoLoad?: boolean
  }>(),
  {
    title: 'Ajustes del sistema',
    description: 'Valores que controlan el comportamiento del sistema. Cada cambio queda registrado con su motivo.',
    autoLoad: true
  }
)

onMounted(() => {
  if (props.autoLoad && !props.admin.loaded && !props.admin.loading) props.admin.load()
})

const uid = useId()
const fieldId = (setting: SettingItem) => `${uid}-${setting.key}`
const reasonId = `${uid}-reason`

function numberStep(setting: SettingItem) {
  return setting.type === 'int' ? 1 : 'any'
}

function rangeText(setting: SettingItem) {
  return describeRange(setting.min, setting.max, setting.unit)
}

function boolDraft(setting: SettingItem) {
  return props.admin.draftOf(setting) === true
}

function draftText(setting: SettingItem) {
  const draft = props.admin.draftOf(setting)
  return typeof draft === 'string' ? draft : ''
}

const open = computed({
  get: () => props.admin.saveOpen,
  set: (value: boolean) => {
    // eslint-disable-next-line vue/no-mutating-props -- estado reactivo compartido de useSettingsAdmin
    props.admin.saveOpen = value
  }
})
const historyOpen = computed({
  get: () => props.admin.historyOpen,
  set: (value: boolean) => {
    // eslint-disable-next-line vue/no-mutating-props -- estado reactivo compartido de useSettingsAdmin
    props.admin.historyOpen = value
  }
})
const reason = computed({
  get: () => props.admin.reason,
  set: (value: string) => {
    // eslint-disable-next-line vue/no-mutating-props -- estado reactivo compartido de useSettingsAdmin
    props.admin.reason = value
  }
})

const historyType = computed(() => props.admin.historyTarget?.type)
const historyUnit = computed(() => props.admin.historyTarget?.unit)
</script>

<template>
  <div class="space-y-6" data-testid="settings-panel">
    <UiPageHeader :title="title" :description="description" />

    <UiAlert variant="info" data-testid="settings-notice">
      {{ SETTINGS_PROPAGATION_NOTICE }}
    </UiAlert>

    <div v-if="admin.loading && !admin.loaded" class="flex items-center gap-2 text-sm text-text-muted" role="status">
      <UiSpinner size="sm" color="primary" />
      <span>Cargando ajustes…</span>
    </div>

    <div v-else-if="admin.loadError" class="space-y-3" data-testid="settings-error">
      <UiAlert :message="admin.loadError" />
      <UiButton variant="secondary" :loading="admin.loading" @click="admin.load()">
        Reintentar
      </UiButton>
    </div>

    <template v-else-if="admin.isEmpty || (admin.loaded && admin.groups.length === 0)">
      <slot name="empty">
        <p class="rounded-lg border border-dashed border-border px-4 py-8 text-center text-sm text-text-muted" data-testid="settings-empty">
          No hay ajustes configurables por ahora.
        </p>
      </slot>
    </template>

    <template v-else>
      <UiCard
        v-for="group in admin.groups"
        :key="group.group"
        as="section"
        :title="group.group"
        data-testid="settings-group"
      >
        <ul class="divide-y divide-border">
          <li
            v-for="setting in group.settings"
            :key="setting.key"
            class="grid gap-4 py-4 first:pt-0 last:pb-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,20rem)]"
            data-testid="setting-row"
            :data-key="setting.key"
          >
            <div class="min-w-0 space-y-1">
              <p :id="`${fieldId(setting)}-title`" class="text-sm font-semibold text-text">
                {{ setting.description }}
              </p>
              <p class="text-xs text-text-muted">
                Valor por defecto: <strong class="font-medium">{{ formatSettingValue(setting.default, setting.type, setting.unit) }}</strong>
                <template v-if="setting.type !== 'bool' && rangeText(setting)">
                  · {{ rangeText(setting) }}
                </template>
              </p>
              <p v-if="setting.requires_security_permission" class="text-xs font-medium text-warning-800">
                Solo con permiso de seguridad
              </p>
              <p v-if="describeLastChange(setting)" class="text-xs text-text-muted">
                {{ describeLastChange(setting) }}
              </p>
              <p v-else class="text-xs text-text-muted">
                Sin modificaciones: usa el valor por defecto.
              </p>
            </div>

            <div class="space-y-3">
              <div v-if="setting.type === 'bool'" class="flex items-center gap-3">
                <button
                  :id="fieldId(setting)"
                  type="button"
                  role="switch"
                  :aria-checked="boolDraft(setting)"
                  :aria-labelledby="`${fieldId(setting)}-title`"
                  :disabled="!admin.canEditSetting(setting) || admin.saving"
                  class="relative inline-flex h-6 w-11 shrink-0 items-center rounded-full transition-colors duration-150 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                  :class="boolDraft(setting) ? 'bg-primary-600' : 'bg-default-300'"
                  @click="admin.setDraft(setting, !boolDraft(setting))"
                >
                  <span
                    class="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform duration-150"
                    :class="boolDraft(setting) ? 'translate-x-5' : 'translate-x-0.5'"
                  />
                </button>
                <span class="text-sm text-text">{{ boolDraft(setting) ? 'Activado' : 'Desactivado' }}</span>
              </div>

              <UiFormField
                v-else
                :field-id="fieldId(setting)"
                :error="admin.draftErrors[setting.key] ?? undefined"
              >
                <div class="flex items-center gap-2">
                  <UiTextInput
                    :id="fieldId(setting)"
                    :model-value="draftText(setting)"
                    :type="setting.type === 'str' ? 'text' : 'number'"
                    :min="setting.min ?? undefined"
                    :max="setting.max ?? undefined"
                    :step="setting.type === 'str' ? undefined : numberStep(setting)"
                    :disabled="!admin.canEditSetting(setting) || admin.saving"
                    :aria-label="setting.description"
                    @update:model-value="admin.setDraft(setting, $event)"
                  />
                  <span v-if="setting.unit" class="shrink-0 text-sm text-text-muted">{{ setting.unit }}</span>
                </div>
              </UiFormField>

              <p v-if="admin.lockedReason(setting)" class="text-xs text-text-muted" data-testid="setting-locked">
                {{ admin.lockedReason(setting) }}
              </p>

              <div class="flex flex-wrap items-center gap-2">
                <UiButton
                  size="sm"
                  :disabled="!admin.canEditSetting(setting) || !admin.isDirty(setting)"
                  data-testid="setting-save"
                  @click="admin.askSave(setting)"
                >
                  Guardar
                </UiButton>
                <UiButton
                  size="sm"
                  variant="secondary"
                  :disabled="!admin.canEditSetting(setting) || (admin.isDefault(setting) && !admin.isDirty(setting))"
                  data-testid="setting-reset"
                  @click="admin.resetDraft(setting)"
                >
                  Restablecer
                </UiButton>
                <UiButton
                  size="sm"
                  variant="ghost"
                  data-testid="setting-history"
                  @click="admin.openHistory(setting)"
                >
                  Historial
                </UiButton>
              </div>
            </div>
          </li>
        </ul>
      </UiCard>
    </template>

    <UiFormModal
      v-model:open="open"
      title="Guardar cambio"
      :description="admin.target?.description"
      :submitting="admin.saving"
      :form-error="admin.saveError"
      submit-label="Guardar cambio"
      @submit="admin.confirmSave()"
    >
      <div class="rounded-lg bg-default-100 px-4 py-3 text-sm" data-testid="settings-diff">
        <span class="text-text-muted">Antes:</span>
        <strong class="font-medium"> {{ admin.beforeText }}</strong>
        <span aria-hidden="true" class="mx-2 text-text-muted">→</span>
        <span class="text-text-muted">Después:</span>
        <strong class="font-medium"> {{ admin.afterText }}</strong>
      </div>
      <UiFormField
        :field-id="reasonId"
        label="Motivo del cambio"
        required
        :hint="`Obligatorio, de ${REASON_MIN} a ${REASON_MAX} caracteres. Queda en el historial.`"
        :error="admin.reasonError ?? undefined"
      >
        <UiTextarea v-model="reason" :rows="3" :maxlength="REASON_MAX" />
      </UiFormField>
      <p class="text-xs text-text-muted">
        {{ SETTINGS_PROPAGATION_NOTICE }}
      </p>
    </UiFormModal>

    <UiModal
      v-model:open="historyOpen"
      title="Historial del ajuste"
      :description="admin.historyTarget?.description"
      size="xl"
    >
      <div class="space-y-3" data-testid="settings-history">
        <div v-if="admin.historyLoading" class="flex items-center gap-2 text-sm text-text-muted" role="status">
          <UiSpinner size="sm" color="primary" />
          <span>Cargando historial…</span>
        </div>
        <div v-else-if="admin.historyError" class="space-y-3">
          <UiAlert :message="admin.historyError" />
          <UiButton variant="secondary" size="sm" @click="admin.setHistoryPage(admin.historyPage)">
            Reintentar
          </UiButton>
        </div>
        <p v-else-if="admin.historyItems.length === 0" class="py-6 text-center text-sm text-text-muted" data-testid="history-empty">
          Este ajuste todavía no tiene cambios registrados.
        </p>
        <ol v-else class="space-y-3">
          <li
            v-for="item in admin.historyItems"
            :key="item.id"
            class="rounded-lg border border-border px-4 py-3 text-sm"
            data-testid="history-item"
          >
            <p class="font-medium text-text">
              {{ formatSettingValue(item.old_value, historyType, historyUnit) }}
              <span aria-hidden="true" class="mx-1 text-text-muted">→</span>
              <span class="sr-only"> cambió a </span>
              {{ formatSettingValue(item.new_value, historyType, historyUnit) }}
            </p>
            <p class="mt-1 text-xs text-text-muted">
              {{ formatDateTime(item.changed_at) }} · {{ item.changed_by_username || item.changed_by || 'Sistema' }}
            </p>
            <p v-if="item.reason" class="mt-1 text-text">
              Motivo: {{ item.reason }}
            </p>
          </li>
        </ol>
        <UiPagination
          v-if="admin.historyTotal > admin.historyPageSize"
          :page="admin.historyPage"
          :page-size="admin.historyPageSize"
          :total="admin.historyTotal"
          @update:page="admin.setHistoryPage($event)"
        />
      </div>
      <template #footer="{ close }">
        <UiButton variant="secondary" @click="close">
          Cerrar
        </UiButton>
      </template>
    </UiModal>
  </div>
</template>
