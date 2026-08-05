import { ref, type Ref } from 'vue'

export type RefreshLoader = () => Promise<void> | void

export interface RefreshController {
  refreshing: Ref<boolean>
  setLoader: (loader: RefreshLoader | null) => void
  refresh: () => Promise<void>
}

/**
 * Module-level singleton coordinating the manual "Refresh" button (shown in the
 * app shell) with the currently mounted list view.
 *
 * The active view registers its data loader via `setLoader` on mount and clears
 * it on unmount; the app shell calls `refresh()` to re-run that loader. A
 * singleton (rather than provide/inject) is used deliberately: the app shell and
 * the route views are lazily loaded as separate chunks, and a provide/inject
 * boundary across that async component tree was not reliably enclosing the
 * views (producing "useRefresh must be used within a provideRefresh() boundary").
 */

const refreshing = ref(false)
let activeLoader: RefreshLoader | null = null

export function useRefresh(): RefreshController {
  return {
    refreshing,
    setLoader(loader: RefreshLoader | null) {
      activeLoader = loader
    },
    async refresh() {
      if (!activeLoader || refreshing.value) return
      refreshing.value = true
      try {
        await activeLoader()
      } finally {
        refreshing.value = false
      }
    },
  }
}
