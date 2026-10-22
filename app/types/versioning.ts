/** Ciclo de vida de una entidad versionada: `draft -> published -> retired`. */
export type VersionStatus = 'draft' | 'published' | 'retired'

/** Chip extra de una versión (p. ej. "PDF adjunto"), junto a su estado. */
export interface VersionBadge {
  label: string
  variant: 'success' | 'danger' | 'warning' | 'neutral' | 'primary'
}

/** Entrada de `UiVersionTimeline` (camelCase, independiente del módulo). */
export interface VersionTimelineEntry {
  id: string
  versionNumber: number
  status: VersionStatus
  publishedAt?: string | null
  changeNotes?: string | null
  /** Chips propios del módulo, tras el de estado. */
  badges?: VersionBadge[]
  /** Aviso corto bajo la versión (p. ej. por qué no se puede publicar). */
  hint?: string | null
}
