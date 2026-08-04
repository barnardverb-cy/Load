<script setup lang="ts">
import { useOnlineStatus } from '@/composables/useOnlineStatus'

const { online } = useOnlineStatus()
</script>

<template>
  <transition name="offline-banner">
    <div v-if="!online" class="offline-banner" role="status" aria-live="polite">
      <span class="offline-banner__dot" aria-hidden="true"></span>
      You are offline — changes are saved locally and will sync when you reconnect.
    </div>
  </transition>
</template>
