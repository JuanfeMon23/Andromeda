import { mountSuspended } from '@nuxt/test-utils/runtime'
import { enableAutoUnmount } from '@vue/test-utils'
import { afterEach, describe, expect, it } from 'vitest'
import type { ActivityEventRead } from '../../types/activity'
import UiActivityTimeline from './UiActivityTimeline.vue'

enableAutoUnmount(afterEach)

const base: ActivityEventRead = {
  id: 'e1',
  entity_type: 'area',
  entity_id: 'a1',
  action: 'deactivated',
  reason: 'Cierre',
  occurred_at: '2026-10-01T12:00:00Z'
}

const mountTimeline = (events: ActivityEventRead[]) =>
  mountSuspended(UiActivityTimeline, { props: { entityType: 'area', events } })

describe('UiActivityTimeline actor', () => {
  it('muestra "por <nombre>" cuando hay actor_username', async () => {
    const wrapper = await mountTimeline([{ ...base, actor_user_id: 'u1', actor_username: 'jperez' }])
    expect(wrapper.text()).toContain('por jperez')
  })

  it('no muestra actor con actor_username null', async () => {
    const wrapper = await mountTimeline([{ ...base, actor_user_id: null, actor_username: null }])
    expect(wrapper.text()).not.toContain('por ')
    expect(wrapper.text()).not.toContain('—')
  })

  it('no muestra actor si el campo no viene (Leo/Acuarius)', async () => {
    const wrapper = await mountTimeline([base])
    expect(wrapper.text()).not.toContain('por ')
  })

  it('no muestra actor con actor_username vacío', async () => {
    const wrapper = await mountTimeline([{ ...base, actor_username: '' }])
    expect(wrapper.text()).not.toContain('por ')
  })
})
