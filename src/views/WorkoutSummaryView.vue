<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute } from 'vue-router'

import { getWorkout } from '@/services/workouts'
import type { WorkoutSessionBundle, WorkoutSessionSet } from '@/types/workout'
import { getErrorMessage } from '@/utils/errors'
import {
  formatDuration,
  nextProgressionTarget,
  workoutDurationSeconds,
  workoutVolume,
} from '@/utils/workout'

const route = useRoute()
const workout = ref<WorkoutSessionBundle | null>(null)
const errorMessage = ref('')
const loading = ref(true)
const completedSets = computed(
  () =>
    workout.value?.exercises
      .flatMap((item) => item.sets)
      .filter((set) => set.status === 'completed').length ?? 0,
)
const skippedSets = computed(
  () =>
    workout.value?.exercises.flatMap((item) => item.sets).filter((set) => set.status === 'skipped')
      .length ?? 0,
)
const isCancelled = computed(() => workout.value?.status === 'cancelled')

function resultLabel(set: WorkoutSessionSet) {
  if (set.status === 'completed') return `${set.actual_reps} × ${Number(set.actual_weight)} kg`
  return set.status === 'skipped' ? 'Skipped' : 'Not logged'
}

function progressionLabel(set: WorkoutSessionSet) {
  const next = nextProgressionTarget(set)
  if (next.outcome === 'increase_weight') return `Add ${Number(set.weight_increment)} kg`
  if (next.outcome === 'increase_reps') return 'Add 1 rep'
  return 'Repeat target'
}

onMounted(async () => {
  try {
    workout.value = await getWorkout(String(route.params.id))
  } catch (error) {
    errorMessage.value = getErrorMessage(error, 'Unable to load the workout summary.')
  } finally {
    loading.value = false
  }
})
</script>

<template>
  <div class="page page--narrow">
    <div v-if="loading" class="empty-state">Loading summary…</div>
    <p v-else-if="errorMessage" class="alert alert--error" role="alert">{{ errorMessage }}</p>
    <template v-else-if="workout">
      <header :class="['summary-hero', { 'summary-hero--cancelled': isCancelled }]">
        <span class="summary-hero__check">{{ isCancelled ? '×' : '✓' }}</span>
        <p class="eyebrow">{{ isCancelled ? 'Workout ended' : 'Workout complete' }}</p>
        <h1>{{ workout.program_name }}</h1>
        <p>
          {{
            isCancelled
              ? 'Your logged sets remain saved in your history.'
              : 'Strong work. Your set-by-set results have been saved.'
          }}
        </p>
      </header>

      <section class="summary-stats">
        <div>
          <span>Duration</span
          ><strong>{{
            formatDuration(workoutDurationSeconds(workout.started_at, workout.completed_at))
          }}</strong>
        </div>
        <div>
          <span>Completed sets</span><strong>{{ completedSets }}</strong>
        </div>
        <div>
          <span>Volume</span><strong>{{ workoutVolume(workout).toLocaleString() }} kg</strong>
        </div>
      </section>

      <section class="summary-breakdown">
        <div class="editable-section-heading">
          <div>
            <p class="eyebrow">Exercise breakdown</p>
            <h2>Your results</h2>
          </div>
          <span v-if="skippedSets" class="count-badge">{{ skippedSets }} skipped</span>
        </div>
        <article v-for="exercise in workout.exercises" :key="exercise.id">
          <div>
            <strong>{{ exercise.exercise_name }}</strong
            ><small>{{ exercise.muscle_group }} · {{ exercise.equipment }}</small>
          </div>
          <ul>
            <li v-for="set in exercise.sets" :key="set.id" class="summary-set-result">
              <span>Set {{ set.position }}</span>
              <div>
                <strong>{{ resultLabel(set) }}</strong>
                <small>
                  Next: {{ nextProgressionTarget(set).reps }} reps ×
                  {{ nextProgressionTarget(set).weight }} kg
                  <em
                    :class="[
                      'progression-badge',
                      `progression-badge--${nextProgressionTarget(set).outcome}`,
                    ]"
                  >
                    {{ progressionLabel(set) }}
                  </em>
                </small>
              </div>
            </li>
          </ul>
        </article>
      </section>

      <div class="summary-actions">
        <RouterLink class="button button--primary" to="/programs">Back to programs</RouterLink>
        <RouterLink class="button button--secondary" to="/history">Workout history</RouterLink>
      </div>
    </template>
  </div>
</template>
