<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'

const props = withDefaults(
  defineProps<{ message: string; tone?: 'success' | 'error'; duration?: number }>(),
  { tone: 'success', duration: 3000 },
)
const emit = defineEmits<{ dismiss: [] }>()
let timer: ReturnType<typeof globalThis.setTimeout> | undefined

watch(
  () => props.message,
  (message) => {
    if (timer) globalThis.clearTimeout(timer)
    if (message) timer = globalThis.setTimeout(() => emit('dismiss'), props.duration)
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (timer) globalThis.clearTimeout(timer)
})
</script>

<template>
  <Teleport to="body">
    <Transition name="toast">
      <div
        v-if="message"
        :class="['toast-notification', { 'toast-notification--error': tone === 'error' }]"
        :role="tone === 'error' ? 'alert' : 'status'"
        aria-live="polite"
      >
        <span aria-hidden="true">{{ tone === 'error' ? '!' : '✓' }}</span>
        {{ message }}
      </div>
    </Transition>
  </Teleport>
</template>
