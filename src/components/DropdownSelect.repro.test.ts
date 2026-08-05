import { describe, it, expect } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref } from 'vue'
import DropdownSelect from './DropdownSelect.vue'

function makeWrapper(two = false) {
  const host = document.createElement('div')
  document.body.appendChild(host)
  const updates: string[] = []
  const Wrapper = defineComponent({
    components: { DropdownSelect },
    setup() {
      const a = ref('')
      const b = ref('')
      return () =>
        h('div', {}, [
          h(DropdownSelect, {
            modelValue: a.value,
            options: [
              { value: 'a1', label: 'A1' },
              { value: 'a2', label: 'A2' },
            ],
            label: 'First',
            'onUpdate:modelValue': (v: string) => {
              a.value = v
              updates.push('a:' + v)
            },
          }),
          two
            ? h(DropdownSelect, {
                modelValue: b.value,
                options: [
                  { value: 'b1', label: 'B1' },
                  { value: 'b2', label: 'B2' },
                ],
                label: 'Second',
                'onUpdate:modelValue': (v: string) => {
                  b.value = v
                  updates.push('b:' + v)
                },
              })
            : null,
        ])
    },
  })
  const app = createApp(Wrapper)
  app.mount(host)
  return { host, updates, app, unmount: () => app.unmount() }
}

function click(el: Element) {
  el.dispatchEvent(new MouseEvent('click', { bubbles: true }))
}

function triggers(host: HTMLElement) {
  return Array.from(host.querySelectorAll('[aria-haspopup="listbox"]')) as HTMLElement[]
}

describe('DropdownSelect click flow (repro)', () => {
  it('opens on trigger and selects an option, updating modelValue', async () => {
    const { host, updates, unmount } = makeWrapper()
    const trigger = triggers(host)[0]
    click(trigger)
    await nextTick()
    expect(host.querySelector('[role="listbox"]'), 'menu opens').toBeTruthy()

    const options = host.querySelectorAll('[role="option"]')
    click(options[1])
    await nextTick()
    await nextTick()
    expect(updates).toContain('a:a2')
    expect(host.querySelector('[role="listbox"]'), 'menu closes after select').toBeFalsy()
    unmount()
  })

  it('opening the second dropdown closes the first (no overlay trap)', async () => {
    const { host, unmount } = makeWrapper(true)
    const [first, second] = triggers(host)
    click(first)
    await nextTick()
    expect(host.querySelectorAll('[role="listbox"]').length, 'first open').toBe(1)

    click(second)
    await nextTick()
    await nextTick()
    // Only the second menu should remain open.
    const openMenus = host.querySelectorAll('[role="listbox"]')
    expect(openMenus.length, 'exactly one menu open').toBe(1)
    expect(openMenus[0].getAttribute('aria-label')).toBe('Second')
    unmount()
  })

  it('clicking outside closes an open menu', async () => {
    const { host, unmount } = makeWrapper()
    click(triggers(host)[0])
    await nextTick()
    expect(host.querySelector('[role="listbox"]')).toBeTruthy()
    click(document.body)
    await nextTick()
    expect(host.querySelector('[role="listbox"]'), 'menu closes on outside click').toBeFalsy()
    unmount()
  })
})
