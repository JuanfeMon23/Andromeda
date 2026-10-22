/**
 * Clases de `UiSidebar` / `UiAppShell` por punto de quiebre. Tailwind v4 solo
 * genera clases que aparecen COMPLETAS en el código fuente: por eso cada
 * variante está escrita entera (nada de `${bp}:pl-64`).
 */
export type SidebarBreakpoint = 'md' | 'lg' | 'xl'

export interface SidebarBreakpointClasses {
  /** Oculta desde el quiebre (barra móvil, fondo del cajón). */
  hideFrom: string
  /** Visible solo desde el quiebre (`hidden` + `flex`). */
  flexFrom: string
  /** Visible solo desde el quiebre como bloque. */
  blockFrom: string
  /** Oculta desde el quiebre (texto de la barra contraída). */
  hiddenFrom: string
  /** Capa de la barra fija desde el quiebre. */
  zFrom: string
  widthExpanded: string
  widthCollapsed: string
  /** Fija la barra en pantalla desde el quiebre (en móvil es un cajón). */
  translateFrom: string
  justifyCenterFrom: string
  /** Pie de la barra contraída. */
  footerCollapsedFrom: string
  /** Margen del contenido para dejar sitio a la barra. */
  paddingExpanded: string
  paddingCollapsed: string
}

export const SIDEBAR_BREAKPOINT_CLASSES: Record<SidebarBreakpoint, SidebarBreakpointClasses> = {
  md: {
    hideFrom: 'md:hidden',
    flexFrom: 'hidden md:flex',
    blockFrom: 'hidden md:block',
    hiddenFrom: 'md:hidden',
    zFrom: 'md:z-30',
    widthExpanded: 'md:w-64',
    widthCollapsed: 'md:w-[4.5rem]',
    translateFrom: 'md:translate-x-0',
    justifyCenterFrom: 'md:justify-center',
    footerCollapsedFrom: 'md:flex md:justify-center',
    paddingExpanded: 'md:pl-64',
    paddingCollapsed: 'md:pl-[4.5rem]'
  },
  lg: {
    hideFrom: 'lg:hidden',
    flexFrom: 'hidden lg:flex',
    blockFrom: 'hidden lg:block',
    hiddenFrom: 'lg:hidden',
    zFrom: 'lg:z-30',
    widthExpanded: 'lg:w-64',
    widthCollapsed: 'lg:w-[4.5rem]',
    translateFrom: 'lg:translate-x-0',
    justifyCenterFrom: 'lg:justify-center',
    footerCollapsedFrom: 'lg:flex lg:justify-center',
    paddingExpanded: 'lg:pl-64',
    paddingCollapsed: 'lg:pl-[4.5rem]'
  },
  xl: {
    hideFrom: 'xl:hidden',
    flexFrom: 'hidden xl:flex',
    blockFrom: 'hidden xl:block',
    hiddenFrom: 'xl:hidden',
    zFrom: 'xl:z-30',
    widthExpanded: 'xl:w-64',
    widthCollapsed: 'xl:w-[4.5rem]',
    translateFrom: 'xl:translate-x-0',
    justifyCenterFrom: 'xl:justify-center',
    footerCollapsedFrom: 'xl:flex xl:justify-center',
    paddingExpanded: 'xl:pl-64',
    paddingCollapsed: 'xl:pl-[4.5rem]'
  }
}
