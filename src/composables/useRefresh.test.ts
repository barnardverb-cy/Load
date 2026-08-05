import { describe, it, expect, afterEach } from 'vitest'
import { useRefresh } from './useRefresh'

describe('useRefresh singleton', () => {
  afterEach(() => useRefresh().setLoader(null))

  it('returns a controller without throwing (no provide boundary required)', () => {
    const ctrl = useRefresh()
    expect(typeof ctrl.setLoader).toBe('function')
    expect(typeof ctrl.refresh).toBe('function')
    expect(ctrl.refreshing.value).toBe(false)
  })

  it('refresh() runs the registered loader and toggles refreshing around the call', async () => {
    const ctrl = useRefresh()
    let ran = false
    ctrl.setLoader(() => {
      ran = true
    })

    const pending = ctrl.refresh()
    expect(ctrl.refreshing.value).toBe(true)

    await pending
    expect(ran).toBe(true)
    expect(ctrl.refreshing.value).toBe(false)
  })

  it('refresh() is a no-op when no loader is registered', async () => {
    const ctrl = useRefresh()
    ctrl.setLoader(null)
    await expect(ctrl.refresh()).resolves.toBeUndefined()
    expect(ctrl.refreshing.value).toBe(false)
  })
})
