<script setup lang="ts">
/**
 * Armazón de una app con barra lateral: `UiSidebar` + columna de contenido con
 * el margen responsivo (se ajusta solo al contraer la barra, con transición) +
 * `<main>`. Sustituye al layout que cada app copiaba.
 *
 * - `items`, `brand`, `brandTo`, `storageKey`, `breakpoint`: se pasan a `UiSidebar`.
 * - `contentWidth`: `contained` (centrado, `max-w-6xl`) o `full` (todo el ancho).
 * - Slots: `#default` (contenido de la página, dentro de `<main>`);
 *   `#topbar="{ openMenu, mobileOpen }"` (barra superior propia de la app, encima
 *   del `<main>`; al usarlo se oculta la barra móvil de la barra lateral y la app
 *   abre el cajón con `openMenu`); `#sidebar-footer="{ collapsed }"`;
 *   `#brand="{ collapsed }"` (sustituye a la marca).
 *
 * @example
 * <UiAppShell :items="menu" brand="Leo" storage-key="leo.sidebar.collapsed">
 *   <template #topbar="{ openMenu }"><MyTopBar @menu="openMenu" /></template>
 *   <NuxtPage />
 * </UiAppShell>
 */
import { computed, ref, useSlots } from 'vue'
import { SIDEBAR_BREAKPOINT_CLASSES } from '../../utils/sidebarBreakpoints'
import type { SidebarBreakpoint } from '../../utils/sidebarBreakpoints'
import type { UiSidebarItem } from './UiSidebar.vue'

const props = withDefaults(
  defineProps<{
    items: UiSidebarItem[]
    brand?: string
    brandTo?: string
    storageKey?: string
    breakpoint?: SidebarBreakpoint
    contentWidth?: 'contained' | 'full'
  }>(),
  {
    brand: '',
    brandTo: undefined,
    storageKey: undefined,
    breakpoint: 'lg',
    contentWidth: 'contained'
  }
)

const slots = useSlots()
const collapsed = ref(false)
const mobileOpen = ref(false)

const cls = computed(() => SIDEBAR_BREAKPOINT_CLASSES[props.breakpoint])
const mainClass = computed(() =>
  props.contentWidth === 'full' ? 'w-full px-4 py-6' : 'mx-auto max-w-6xl px-4 py-6'
)

function openMenu() {
  mobileOpen.value = true
}
</script>

<template>
  <div class="min-h-screen bg-background text-text">
    <UiSidebar
      v-model:collapsed="collapsed"
      v-model:mobile-open="mobileOpen"
      :items="items"
      :brand="brand"
      :brand-to="brandTo"
      :storage-key="storageKey"
      :breakpoint="breakpoint"
      :hide-mobile-bar="Boolean(slots.topbar)"
    >
      <template v-if="$slots.brand" #brand="slotProps">
        <slot name="brand" v-bind="slotProps" />
      </template>
      <template v-if="$slots['sidebar-footer']" #footer="slotProps">
        <slot name="sidebar-footer" v-bind="slotProps" />
      </template>
    </UiSidebar>

    <!-- El contenido deja el espacio de la barra lateral desde el quiebre -->
    <div
      class="transition-[padding] duration-200"
      :class="collapsed ? cls.paddingCollapsed : cls.paddingExpanded"
    >
      <slot name="topbar" :open-menu="openMenu" :mobile-open="mobileOpen" />
      <main :class="mainClass">
        <slot />
      </main>
    </div>
  </div>
</template>
