# Andromeda

Shared design system for our Nuxt apps (Vladimir, Incubus, ...): a Nuxt **layer** with HeroUI-style
`Ui*` components, Tailwind v4 design tokens and the generic form composables.

## Use it

```ts
// nuxt.config.ts of the consuming app
export default defineNuxtConfig({
  extends: ['../../andromeda'] // or 'github:JuanfeMon23/Andromeda' once published
})
```

The app must provide `nuxt`, `vue`, `vee-validate`, `@vee-validate/zod` and `zod` itself (they are not
declared as peers here on purpose: pnpm would install duplicate copies and break form injection).
Do **not** add `@tailwindcss/vite` or your own token CSS in the app; the layer already does.

## What is inside

- `app/components/ui/` — `UiButton`, `UiTextInput`, `UiSelect`, `UiTextarea`, `UiCheckbox`, `UiFormField`,
  `UiModal`, `UiFormModal`, `UiConfirmModal`, `UiTabs`, `UiDataTable`, `UiExpandableList`, `UiItemList`,
  `UiPagination`, `UiSearchInput`, `UiListToolbar`, `UiSearchEmpty`, `UiAlert`, `UiCard`, `UiSection`,
  `UiPageHeader`, `UiSpinner`, `UiStatusBadge`, `UiActiveFilter`.
- `app/assets/css/main.css` — color/radius/shadow tokens (`bg-primary-500`, `text-text-muted`, ...).
- `app/composables/` — `useZodForm`, `useFormControl`, `useConfirmAction`, `useDebouncedRef`.
- `app/utils/` — `zodFields`, `activeOptions`, `search`, `formControlClasses`.
- Import explicitly from the app with the `#andromeda/...` alias (e.g. `#andromeda/utils/search`).

## Rules

- Only app-agnostic pieces live here. Anything tied to one app's API or domain (versions, activity
  timeline, PDF preview, `useApi`) stays in that app.
- A component used by more than one app moves here instead of being copied.
- `UiFormModal`'s optional `activity` tab renders `UiActivityTimeline` if the app defines it.
