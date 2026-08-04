<script setup lang="ts">
import { kilogramsToDisplay } from '@/utils/units'

interface Improvement {
  exercise: string
  previousOneRepMax: number | null
  latestOneRepMax: number | null
  deltaOneRepMax: number | null
  percent: number | null
  latestDate: string
}

defineProps<{
  improvements: Improvement[]
  unit: 'kg' | 'lb'
}>()

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
    new Date(`${value}T12:00:00`),
  )
}
</script>

<template>
  <ul v-if="improvements.length" class="strength-list">
    <li v-for="item in improvements" :key="item.exercise">
      <div class="strength-list__name">
        <strong>{{ item.exercise }}</strong>
        <small>{{ formatDate(item.latestDate) }}</small>
      </div>
      <div class="strength-list__change">
        <span class="strength-list__delta"
          >+{{ kilogramsToDisplay(item.deltaOneRepMax ?? 0, unit) }} {{ unit }}</span
        >
        <small v-if="item.percent !== null" class="strength-list__percent"
          >+{{ item.percent }}%</small
        >
        <span class="strength-list__est"
          >est. 1RM {{ kilogramsToDisplay(item.latestOneRepMax ?? 0, unit) }} {{ unit }}</span
        >
      </div>
    </li>
  </ul>
  <p v-else class="strength-list__empty">
    Finish two sessions of the same exercise to see gains here.
  </p>
</template>
