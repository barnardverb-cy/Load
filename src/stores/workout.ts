import { computed, ref } from 'vue'
import { defineStore } from 'pinia'

import {
  cancelWorkout,
  finishWorkout,
  getWorkout,
  updateWorkoutNotes,
  updateWorkoutSet,
} from '@/services/workouts'
import type { WorkoutSessionBundle, WorkoutSetUpdate } from '@/types/workout'

export const useWorkoutStore = defineStore('workout', () => {
  const workout = ref<WorkoutSessionBundle | null>(null)
  const loading = ref(false)

  const sets = computed(() => workout.value?.exercises.flatMap((exercise) => exercise.sets) ?? [])
  const completedSetCount = computed(
    () => sets.value.filter((set) => set.status === 'completed').length,
  )
  const resolvedSetCount = computed(
    () => sets.value.filter((set) => set.status !== 'pending').length,
  )
  const canFinish = computed(
    () => sets.value.length > 0 && resolvedSetCount.value === sets.value.length,
  )

  async function load(id: string) {
    loading.value = true
    try {
      workout.value = await getWorkout(id)
    } finally {
      loading.value = false
    }
  }

  async function updateSet(id: string, update: WorkoutSetUpdate) {
    const saved = await updateWorkoutSet(id, update)
    if (!workout.value) return saved

    for (const exercise of workout.value.exercises) {
      const index = exercise.sets.findIndex((set) => set.id === id)
      if (index >= 0) {
        exercise.sets[index] = saved
        break
      }
    }
    return saved
  }

  async function saveNotes(notes: string) {
    if (!workout.value) return
    await updateWorkoutNotes(workout.value.id, notes)
    workout.value.notes = notes.trim() || null
  }

  async function finish() {
    if (!workout.value) return
    await finishWorkout(workout.value.id)
    await load(workout.value.id)
  }

  async function cancel() {
    if (!workout.value) return
    await cancelWorkout(workout.value.id)
    await load(workout.value.id)
  }

  function clear() {
    workout.value = null
  }

  return {
    workout,
    loading,
    sets,
    completedSetCount,
    resolvedSetCount,
    canFinish,
    load,
    updateSet,
    saveNotes,
    finish,
    cancel,
    clear,
  }
})
