<script setup lang="ts">
/**
 * Barra lateral de navegación con iconos. Se contrae a solo iconos (estado
 * recordado en este navegador) y por debajo de `breakpoint` pasa a un cajón
 * que se abre con el botón de menú.
 *
 * `items[].icon` es el atributo `d` de un path SVG 24×24 (trazo, sin relleno);
 * `section` agrupa los elementos bajo un título. Casi siempre se usa dentro de
 * `UiAppShell`, que además reserva el margen del contenido; suelta, el margen
 * (`<bp>:pl-64` / `<bp>:pl-[4.5rem]`) lo pone la app con `v-model:collapsed`.
 *
 * - `breakpoint`: desde cuándo la barra es fija (`md` | `lg` | `xl`; `lg` por defecto).
 * - `v-model:collapsed` / `v-model:mobile-open`: estado de contracción y del cajón móvil.
 * - `hide-mobile-bar`: oculta la barra superior móvil propia (la app trae su topbar
 *   y abre el cajón con `mobile-open`).
 * - `brandTo`: enlaza la marca (por defecto texto sin enlace).
 * - Slots: `#brand="{ collapsed }"` (sustituye a la marca), `#footer="{ collapsed }"`.
 *
 * El estado contraído se lee de `localStorage` al crearse (en SPA, antes del
 * primer render) para no parpadear expandido.
 *
 * @example
 * <UiSidebar :items="[{ label: 'Inicio', to: '/', icon: 'M3 12l9-9 9 9M5 10v10h14V10' }]" brand="Incubus">
 *   <template #footer>…</template>
 * </UiSidebar>
 */
import { computed, onMounted, watch } from 'vue'
import { SIDEBAR_BREAKPOINT_CLASSES } from '../../utils/sidebarBreakpoints'
import type { SidebarBreakpoint } from '../../utils/sidebarBreakpoints'

export interface UiSidebarItem {
  label: string
  to: string
  icon: string
  section?: string
}

const props = withDefaults(
  defineProps<{
    items: UiSidebarItem[]
    brand?: string
    /** Enlace de la marca (p. ej. `/`). */
    brandTo?: string
    /** Clave de `localStorage` donde se recuerda si está contraída. */
    storageKey?: string
    /** Desde qué ancho la barra es fija; por debajo es un cajón. */
    breakpoint?: SidebarBreakpoint
    /** Oculta la barra superior móvil propia. */
    hideMobileBar?: boolean
  }>(),
  {
    brand: '',
    brandTo: undefined,
    storageKey: 'andromeda.sidebar.collapsed',
    breakpoint: 'lg',
    hideMobileBar: false
  }
)

const collapsed = defineModel<boolean>('collapsed', { default: false })
const mobileOpen = defineModel<boolean>('mobileOpen', { default: false })

const route = useRoute()
const cls = computed(() => SIDEBAR_BREAKPOINT_CLASSES[props.breakpoint])

function readStored() {
  try {
    collapsed.value = localStorage.getItem(props.storageKey) === '1'
  } catch {
    /* almacenamiento no disponible */
  }
}

// SPA: se lee ya en el setup, antes del primer render. Con SSR (hidratando) se
// espera al montaje para no romper la hidratación.
if (import.meta.client && !useNuxtApp().isHydrating) readStored()
else onMounted(readStored)

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  try {
    localStorage.setItem(props.storageKey, collapsed.value ? '1' : '0')
  } catch {
    /* almacenamiento no disponible */
  }
}

watch(() => route.fullPath, () => {
  mobileOpen.value = false
})

const isActive = (to: string) => route.path === to || route.path.startsWith(`${to}/`)

// Elementos agrupados por sección, conservando el orden de aparición.
const groups = computed(() => {
  const map = new Map<string, UiSidebarItem[]>()
  for (const item of props.items) {
    const key = item.section ?? ''
    map.set(key, [...(map.get(key) ?? []), item])
  }
  return [...map.entries()].map(([section, items]) => ({ section, items }))
})
</script>

<template>
  <!-- Barra superior en pantallas pequeñas -->
  <div
    v-if="!hideMobileBar"
    class="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface px-4 py-2"
    :class="cls.hideFrom"
  >
    <button
      type="button"
      class="flex h-9 w-9 items-center justify-center rounded-md hover:bg-default-100"
      aria-label="Abrir menú"
      @click="mobileOpen = true"
    >
      <svg viewBox="0 0 24 24" class="h-5 w-5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" aria-hidden="true">
        <path d="M4 6h16M4 12h16M4 18h16" />
      </svg>
    </button>
    <NuxtLink v-if="brandTo" :to="brandTo" class="font-semibold tracking-tight">{{ brand }}</NuxtLink>
    <span v-else class="font-semibold tracking-tight">{{ brand }}</span>
  </div>

  <!-- Fondo del cajón móvil -->
  <div
    v-if="mobileOpen"
    class="fixed inset-0 z-40 bg-black/40"
    :class="cls.hideFrom"
    aria-hidden="true"
    @click="mobileOpen = false"
  />

  <aside
    class="fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-surface transition-all duration-200"
    :class="[
      cls.zFrom,
      collapsed ? cls.widthCollapsed : cls.widthExpanded,
      mobileOpen ? 'w-64 translate-x-0' : ['-translate-x-full w-64', cls.translateFrom]
    ]"
    aria-label="Navegación principal"
  >
    <div class="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
      <slot name="brand" :collapsed="collapsed">
        <NuxtLink
          v-if="brandTo"
          :to="brandTo"
          class="truncate text-lg font-semibold tracking-tight"
          :class="collapsed ? cls.hiddenFrom : ''"
        >
          {{ brand }}
        </NuxtLink>
        <span v-else class="truncate text-lg font-semibold tracking-tight" :class="collapsed ? cls.hiddenFrom : ''">
          {{ brand }}
        </span>
      </slot>
      <button
        type="button"
        class="ml-auto h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-default-100"
        :class="[cls.flexFrom, collapsed ? 'mx-auto' : '']"
        :aria-label="collapsed ? 'Expandir menú' : 'Contraer menú'"
        @click="toggleCollapsed"
      >
        <svg viewBox="0 0 24 24" class="h-4 w-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path :d="collapsed ? 'M9 6l6 6-6 6' : 'M15 6l-6 6 6 6'" />
        </svg>
      </button>
    </div>

    <nav class="flex-1 space-y-4 overflow-y-auto px-3 py-4">
      <div v-for="group in groups" :key="group.section" class="space-y-1">
        <p
          v-if="group.section"
          class="px-3 pb-1 text-[0.7rem] font-semibold uppercase tracking-wider text-text-muted"
          :class="collapsed ? cls.hiddenFrom : ''"
        >
          {{ group.section }}
        </p>
        <div v-if="group.section && collapsed" class="mx-3 border-t border-border" :class="cls.blockFrom" />
        <NuxtLink
          v-for="item in group.items"
          :key="item.to"
          :to="item.to"
          :title="collapsed ? item.label : undefined"
          class="group flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors"
          :class="[
            isActive(item.to)
              ? 'bg-primary-50 text-primary-700'
              : 'text-default-700 hover:bg-default-100',
            collapsed ? cls.justifyCenterFrom : ''
          ]"
          :aria-current="isActive(item.to) ? 'page' : undefined"
        >
          <svg
            viewBox="0 0 24 24"
            class="h-5 w-5 shrink-0"
            fill="none"
            stroke="currentColor"
            stroke-width="1.8"
            stroke-linecap="round"
            stroke-linejoin="round"
            aria-hidden="true"
          >
            <path :d="item.icon" />
          </svg>
          <span class="truncate" :class="collapsed ? cls.hiddenFrom : ''">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>

    <div v-if="$slots.footer" class="shrink-0 border-t border-border p-3" :class="collapsed ? cls.footerCollapsedFrom : ''">
      <slot name="footer" :collapsed="collapsed" />
    </div>
  </aside>
</template>
