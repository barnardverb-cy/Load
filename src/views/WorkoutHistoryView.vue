<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

import SkeletonLine from '@/components/SkeletonLine.vue'
import { listWorkoutHistory } from '@/services/workouts'
import { useRefresh } from '@/composables/useRefresh'
import type { WorkoutSessionBundle } from '@/types/workout'
import { getErrorMessage } from '@/utils/errors'
import { formatDuration, workoutDurationSeconds, workoutVolume } from '@/utils/workout'

const { refreshing, setLoader } = useRefresh()
const workouts = ref<WorkoutSessionBundle[]>([])
const loading = ref(true)
const errorMessage = ref('')

function formatWorkoutDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

function completedSetCount(workout: WorkoutSessionBundle) {
  return workout.exercises
    .flatMap((exercise) => exercise.sets)
    .filter((set) => set.status === 'completed').length
}

async function load() {
  try {
    workouts.value = await listWorkoutHistory()
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to load workout history.')
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  setLoader(load)
  void load()
})

onBeforeUnmount(() => setLoader(null))
</script>

<template>
  <div class="page page--narrow">
    <header class="page-header">
      <p class="eyebrow">Training history</p>
      <h1>Your workouts</h1>
      <p>Review logged sets and the progression calculated from each session.</p>
    </header>

    <div v-if="loading || refreshing" class="history-list" aria-busy="true">
      <div v-for="n in 4" :key="n" class="history-card history-card--skeleton">
        <div class="history-card__heading">
          <div>
            <SkeletonLine variant="title" width="45%" />
            <SkeletonLine width="30%" />
          </div>
        </div>
        <SkeletonLine width="60%" />
      </div>
    </div>
    <p v-else-if="errorMessage" class="alert alert--error" role="alert">{{ errorMessage }}</p>
    <div v-else-if="workouts.length === 0" class="empty-state">
      <span class="empty-state__icon">◷</span>
      <h2>No workouts yet</h2>
      <p>Your completed and cancelled workouts will appear here.</p>
      <RouterLink class="button button--primary" to="/programs">Start a workout</RouterLink>
    </div>

    <section v-else class="history-list" aria-label="Past workouts">
      <RouterLink
        v-for="workout in workouts"
        :key="workout.id"
        class="history-card"
        :to="`/workouts/${workout.id}/summary`"
      >
        <div class="history-card__heading">
          <div>
            <strong>{{ workout.program_name }}</strong>
            <span>{{ formatWorkoutDate(workout.started_at) }}</span>
          </div>
          <span :class="['history-status', `history-status--${workout.status}`]">
            {{ workout.status === 'completed' ? 'Completed' : 'Cancelled' }}
          </span>
        </div>
        <div class="history-card__stats">
          <span
            ><strong>{{ completedSetCount(workout) }}</strong> sets</span
          >
          <span
            ><strong>{{ workoutVolume(workout).toLocaleString() }}</strong> kg</span
          >
          <span
            ><strong>{{
              formatDuration(workoutDurationSeconds(workout.started_at, workout.completed_at))
            }}</strong>
            duration</span
          >
        </div>
      </RouterLink>
    </section>
  </div>
</template>
