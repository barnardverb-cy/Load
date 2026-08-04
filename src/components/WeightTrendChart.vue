<script setup lang="ts">
import { computed } from 'vue'

interface Point {
  date: string
  value: number
}

const props = defineProps<{
  points: Point[]
  unit: string
  goal?: number | null
  starting?: number | null
}>()

const width = 640
const height = 220
const paddingX = 36
const paddingY = 24

const bounds = computed(() => {
  const values = props.points.map((point) => point.value)
  if (props.goal !== null && props.goal !== undefined) values.push(props.goal)
  if (props.starting !== null && props.starting !== undefined) values.push(props.starting)
  const minimum = Math.min(...values)
  const maximum = Math.max(...values)
  const spread = maximum - minimum || 1
  const padded = spread * 0.12
  return { min: minimum - padded, max: maximum + padded, spread: spread + padded * 2 }
})

const coordinates = computed(() => {
  const { min, spread } = bounds.value
  const points = props.points
  if (!points.length) return []
  return points.map((point, index) => ({
    ...point,
    x:
      points.length === 1
        ? width / 2
        : paddingX + (index / (points.length - 1)) * (width - paddingX * 2),
    y: paddingY + (1 - (point.value - min) / spread) * (height - paddingY * 2),
  }))
})

const polyline = computed(() =>
  coordinates.value.map((point) => `${point.x.toFixed(1)},${point.y.toFixed(1)}`).join(' '),
)

function goalY(value: number | null | undefined): number | null {
  if (value === null || value === undefined) return null
  const { min, spread } = bounds.value
  return paddingY + (1 - (value - min) / spread) * (height - paddingY * 2)
}

const goalLineY = computed(() => goalY(props.goal))

function shortDate(value: string) {
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(
    new Date(`${value}T12:00:00`),
  )
}
</script>

<template>
  <figure class="chart chart--weight">
    <template v-if="coordinates.length">
      <svg :viewBox="`0 0 ${width} ${height}`" role="img" aria-label="Weight trend">
        <line
          v-if="goalLineY !== null"
          class="chart__goal"
          :x1="paddingX"
          :x2="width - paddingX"
          :y1="goalLineY"
          :y2="goalLineY"
        />
        <polyline
          class="chart__area"
          :points="`${paddingX},${height - paddingY} ${polyline} ${width - paddingX},${height - paddingY}`"
        />
        <polyline class="chart__line" :points="polyline" />
        <g v-for="(point, index) in coordinates" :key="point.date">
          <circle
            v-if="index === 0 || index === coordinates.length - 1"
            class="chart__endpoint"
            :cx="point.x"
            :cy="point.y"
            r="4.5"
          />
          <circle class="chart__dot" :cx="point.x" :cy="point.y" r="3" />
        </g>
      </svg>
      <figcaption class="chart__caption">
        <span>{{ shortDate(coordinates[0]!.date) }}</span>
        <span v-if="goalLineY !== null" class="chart__caption-goal">Goal</span>
        <span>{{ shortDate(coordinates[coordinates.length - 1]!.date) }}</span>
      </figcaption>
    </template>
    <p v-else class="chart__empty">Log a weekly check-in to see your trend.</p>
  </figure>
</template>
