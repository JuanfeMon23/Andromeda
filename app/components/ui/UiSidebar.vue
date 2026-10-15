<script setup lang="ts">
/**
 * Barra lateral de navegación con iconos. Se contrae a solo iconos (estado
 * recordado en este navegador) y en pantallas pequeñas pasa a un cajón que se
 * abre con el botón de menú.
 *
 * `items[].icon` es el atributo `d` de un path SVG 24×24 (trazo, sin relleno);
 * `section` agrupa los elementos bajo un título. Emite `update:collapsed` para
 * que la app ajuste el margen de su contenido (`lg:pl-64` / `lg:pl-[4.5rem]`).
 *
 * @example
 * <UiSidebar :items="[{ label: 'Inicio', to: '/', icon: 'M3 12l9-9 9 9M5 10v10h14V10' }]" brand="Incubus">
 *   <template #footer>…</template>
 * </UiSidebar>
 */
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
    /** Clave de `localStorage` donde se recuerda si está contraída. */
    storageKey?: string
  }>(),
  { brand: '', storageKey: 'andromeda.sidebar.collapsed' }
)

const emit = defineEmits<{ 'update:collapsed': [value: boolean] }>()

const route = useRoute()
const collapsed = ref(false)
const mobileOpen = ref(false)

onMounted(() => {
  try {
    collapsed.value = localStorage.getItem(props.storageKey) === '1'
  } catch {
    /* almacenamiento no disponible */
  }
  emit('update:collapsed', collapsed.value)
})

function toggleCollapsed() {
  collapsed.value = !collapsed.value
  emit('update:collapsed', collapsed.value)
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
  <div class="sticky top-0 z-30 flex items-center gap-3 border-b border-border bg-surface px-4 py-2 lg:hidden">
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
    <span class="font-semibold tracking-tight">{{ brand }}</span>
  </div>

  <!-- Fondo del cajón móvil -->
  <div
    v-if="mobileOpen"
    class="fixed inset-0 z-40 bg-black/40 lg:hidden"
    aria-hidden="true"
    @click="mobileOpen = false"
  />

  <aside
    class="fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border bg-surface transition-all duration-200 lg:z-30"
    :class="[
      collapsed ? 'lg:w-[4.5rem]' : 'lg:w-64',
      mobileOpen ? 'w-64 translate-x-0' : '-translate-x-full lg:translate-x-0 w-64'
    ]"
    aria-label="Navegación principal"
  >
    <div class="flex h-14 shrink-0 items-center gap-2 border-b border-border px-4">
      <slot name="brand">
        <span class="truncate text-lg font-semibold tracking-tight" :class="collapsed ? 'lg:hidden' : ''">
          {{ brand }}
        </span>
      </slot>
      <button
        type="button"
        class="ml-auto hidden h-8 w-8 items-center justify-center rounded-md text-text-muted hover:bg-default-100 lg:flex"
        :class="collapsed ? 'mx-auto' : ''"
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
          :class="collapsed ? 'lg:hidden' : ''"
        >
          {{ group.section }}
        </p>
        <div v-if="group.section && collapsed" class="mx-3 hidden border-t border-border lg:block" />
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
            collapsed ? 'lg:justify-center' : ''
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
          <span class="truncate" :class="collapsed ? 'lg:hidden' : ''">{{ item.label }}</span>
        </NuxtLink>
      </div>
    </nav>

    <div v-if="$slots.footer" class="shrink-0 border-t border-border p-3" :class="collapsed ? 'lg:flex lg:justify-center' : ''">
      <slot name="footer" :collapsed="collapsed" />
    </div>
  </aside>
</template>
