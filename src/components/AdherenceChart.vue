<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  days: { date: string; logged: boolean }[]
  /** Optional ISO date of the next scheduled/resumable workout to highlight. */
  highlightDate?: string | null
  label?: string
}>()

function shortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(
    new Date(`${value}T12:00:00`),
  )
}

const cells = computed(() =>
  props.days.map((day) => ({
    ...day,
    label: shortDate(day.date),
    isHighlight: props.highlightDate === day.date,
  })),
)
</script>

<template>
  <div class="adherence-chart" :aria-label="label ?? 'Daily logging adherence'">
    <div
      v-for="day in cells"
      :key="day.date"
      class="adherence-chart__cell"
      :class="{
        'adherence-chart__cell--filled': day.logged,
        'adherence-chart__cell--highlight': day.isHighlight,
      }"
      :title="`${day.date}${day.logged ? ' · logged' : ''}${day.isHighlight ? ' · workout' : ''}`"
    >
      <span aria-hidden="true">{{ day.label }}</span>
    </div>
  </div>
</template>
