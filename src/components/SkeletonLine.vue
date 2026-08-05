<template>
  <span
    class="skeleton-line skeleton-shimmer"
    :class="[`skeleton-line--${variant}`, { 'skeleton-line--block': block }]"
    :style="{ width: width }"
    aria-hidden="true"
  ></span>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    variant?: 'text' | 'title' | 'short'
    width?: string
    block?: boolean
  }>(),
  { variant: 'text', width: '100%', block: false },
)
</script>
