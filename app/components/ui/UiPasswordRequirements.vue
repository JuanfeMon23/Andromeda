<script setup lang="ts">
/**
 * Requisitos de la contraseña con el cumplimiento en vivo, según la política
 * que la app recibe del backend (`passwordPolicyChecks`). Solo lee el valor
 * para calcular; no lo guarda ni lo muestra. Un resumen oculto con
 * `aria-live="polite"` anuncia cuántos requisitos faltan (no cada tecla).
 */
import type { PasswordPolicy } from '../../utils/passwordPolicy'
import { passwordPolicyChecks } from '../../utils/passwordPolicy'

const props = defineProps<{
  password: string
  policy: PasswordPolicy
}>()

const checks = computed(() => passwordPolicyChecks(props.password ?? '', props.policy))
const pending = computed(() => checks.value.filter(c => !c.met).length)
const summary = computed(() => {
  if (!props.password) return ''
  if (pending.value === 0) return 'La contraseña cumple todos los requisitos.'
  return pending.value === 1 ? 'Falta 1 requisito.' : `Faltan ${pending.value} requisitos.`
})
</script>

<template>
  <div>
    <ul class="space-y-1 text-sm" aria-label="Requisitos de la contraseña" data-testid="password-requirements">
      <li
        v-for="check in checks"
        :key="check.id"
        class="flex items-center gap-2"
        :class="check.met ? 'text-success-700' : 'text-text-muted'"
        :data-met="check.met"
        data-testid="password-requirement"
      >
        <svg class="h-4 w-4 shrink-0" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
          <path v-if="check.met" d="M4 10.5l4 4 8-9" stroke-linecap="round" stroke-linejoin="round" />
          <circle v-else cx="10" cy="10" r="6" />
        </svg>
        <span>{{ check.label }}</span>
        <span class="sr-only">{{ check.met ? '(cumplido)' : '(pendiente)' }}</span>
      </li>
    </ul>
    <p class="sr-only" aria-live="polite" aria-atomic="true" data-testid="password-requirements-summary">
      {{ summary }}
    </p>
  </div>
</template>
