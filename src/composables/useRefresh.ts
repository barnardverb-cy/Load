import { inject, provide, ref, type InjectionKey, type Ref } from 'vue'

type Loader = () => Promise<void> | void

interface RefreshContext {
  refreshing: Ref<boolean>
  setLoader: (fn: Loader) => void
  clearLoader: () => void
  refresh: () => Promise<void>
}

const RefreshKey: InjectionKey<RefreshContext> = Symbol('view-refresh')

/**
 * Called once in the app shell (AppLayout). Exposes a refresh control that the
 * currently mounted view can register its data loader against, so a single
 * "refresh" button can reload whatever list is on screen (useful for installed
 * PWA users who have no browser refresh gesture).
 */
export function provideRefresh() {
  const loader = ref<Loader | null>(null)
  const refreshing = ref(false)

  const context: RefreshContext = {
    refreshing,
    setLoader(fn: Loader) {
      loader.value = fn
    },
    clearLoader() {
      loader.value = null
    },
    async refresh() {
      if (!loader.value || refreshing.value) return
      refreshing.value = true
      try {
        await loader.value()
      } finally {
        refreshing.value = false
      }
    },
  }

  provide(RefreshKey, context)
  return context
}

export function useRefresh(): RefreshContext {
  const ctx = inject(RefreshKey)
  if (!ctx) throw new Error('useRefresh must be used within a provideRefresh() boundary')
  return ctx
}
