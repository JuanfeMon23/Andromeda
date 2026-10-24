/**
 * ¿Se monta el panel de una pestaña? Normal: desde la primera visita (luego
 * se oculta con v-show para conservar su estado). `lazy`: solo el activo.
 */
export function shouldRenderPanel(
  key: string,
  active: string,
  visited: ReadonlySet<string>,
  lazy = false
): boolean {
  return lazy ? key === active : visited.has(key)
}
