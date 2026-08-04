<script setup lang="ts">
import { RouterView } from 'vue-router'

import OfflineStatus from '@/components/OfflineStatus.vue'
</script>

<template>
  <OfflineStatus />
  <RouterView />
</template>
