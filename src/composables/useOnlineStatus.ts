import { onMounted, onUnmounted, ref } from 'vue'

/**
 * Reactive online/offline status. SSR-safe and updates on browser connectivity
 * changes so the UI can show a clear "Saved locally" vs "Synced" indicator.
 */
export function useOnlineStatus() {
  const online = ref(typeof navigator !== 'undefined' ? navigator.onLine : true)

  function setOnline(value: boolean) {
    online.value = value
  }

  function handleOnline() {
    setOnline(true)
  }

  function handleOffline() {
    setOnline(false)
  }

  onMounted(() => {
    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
  })

  onUnmounted(() => {
    window.removeEventListener('online', handleOnline)
    window.removeEventListener('offline', handleOffline)
  })

  return { online }
}
