<template>
  <div class="skeleton-card" :style="{ minHeight: height }" aria-hidden="true">
    <div class="skeleton-card__media skeleton-shimmer"></div>
    <div class="skeleton-card__body">
      <span class="skeleton-line skeleton-line--title skeleton-shimmer"></span>
      <span class="skeleton-line skeleton-shimmer"></span>
      <span class="skeleton-line skeleton-line--short skeleton-shimmer"></span>
    </div>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ height?: string }>(), { height: '17rem' })
</script>
