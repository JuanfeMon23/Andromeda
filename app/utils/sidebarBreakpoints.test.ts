import { describe, expect, it } from 'vitest'
import { SIDEBAR_BREAKPOINT_CLASSES } from './sidebarBreakpoints'
import type { SidebarBreakpoint } from './sidebarBreakpoints'

describe('SIDEBAR_BREAKPOINT_CLASSES', () => {
  it.each(['md', 'lg', 'xl'] as SidebarBreakpoint[])('%s: toda clase responsiva usa su propio quiebre', (bp) => {
    for (const value of Object.values(SIDEBAR_BREAKPOINT_CLASSES[bp])) {
      for (const cls of value.split(' ')) {
        if (cls === 'hidden') continue
        expect(cls.startsWith(`${bp}:`)).toBe(true)
      }
    }
  })

  it('el margen del contenido coincide con el ancho de la barra', () => {
    expect(SIDEBAR_BREAKPOINT_CLASSES.lg.widthExpanded).toBe('lg:w-64')
    expect(SIDEBAR_BREAKPOINT_CLASSES.lg.paddingExpanded).toBe('lg:pl-64')
    expect(SIDEBAR_BREAKPOINT_CLASSES.xl.widthCollapsed).toBe('xl:w-[4.5rem]')
    expect(SIDEBAR_BREAKPOINT_CLASSES.xl.paddingCollapsed).toBe('xl:pl-[4.5rem]')
  })
})
