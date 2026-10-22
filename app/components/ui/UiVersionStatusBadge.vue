<script setup lang="ts">
/**
 * Chip del estado de una versión (`draft` / `published` / `retired`) con la
 * etiqueta y el color estándar. Lo usan `UiVersionTimeline` y los editores de
 * versión de print-labels, result-templates y consent-documents.
 */
import type { VersionStatus } from '../../types/versioning'
import { VERSION_STATUS_LABELS, VERSION_STATUS_VARIANTS } from '../../utils/versionStatus'

defineProps<{
  status: VersionStatus
}>()
</script>

<template>
  <UiStatusBadge :variant="VERSION_STATUS_VARIANTS[status]" :label="VERSION_STATUS_LABELS[status]" />
</template>
