const dateTimeFormat = new Intl.DateTimeFormat('es-CO', { dateStyle: 'medium', timeStyle: 'short' })

/**
 * Fecha-hora local legible (es-CO) de un ISO o `Date`. Si el valor no es una
 * fecha, el texto tal cual; vacío/`null` -> cadena vacía.
 */
export function formatDateTime(value: string | Date | null | undefined): string {
  if (value === null || value === undefined || value === '') return ''
  const date = value instanceof Date ? value : new Date(value)
  return Number.isNaN(date.getTime()) ? String(value) : dateTimeFormat.format(date)
}
