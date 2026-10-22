import type { VersionStatus } from '../types/versioning'

export const VERSION_STATUS_LABELS: Record<VersionStatus, string> = {
  draft: 'Borrador',
  published: 'Publicada',
  retired: 'Retirada'
}

export const VERSION_STATUS_VARIANTS: Record<VersionStatus, 'neutral' | 'success' | 'danger'> = {
  draft: 'neutral',
  published: 'success',
  retired: 'danger'
}

/** Color del punto de la línea de tiempo por estado. */
export const VERSION_STATUS_DOT_CLASSES: Record<VersionStatus, string> = {
  draft: 'bg-default-400',
  published: 'bg-success-500',
  retired: 'bg-danger-400'
}
