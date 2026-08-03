import type { WorkoutSessionBundle, WorkoutSessionSet } from '@/types/workout'

export type ProgressionTarget = {
  reps: number
  weight: number
  outcome: 'increase_reps' | 'increase_weight' | 'repeat'
}

export function workoutDurationSeconds(
  startedAt: string,
  completedAt: string | null,
  now = Date.now(),
): number {
  const end = completedAt ? new Date(completedAt).getTime() : now
  return Math.max(0, Math.floor((end - new Date(startedAt).getTime()) / 1000))
}

export function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600)
  const minutes = Math.floor((totalSeconds % 3600) / 60)
  const seconds = totalSeconds % 60
  if (hours > 0)
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`
  return `${minutes}:${String(seconds).padStart(2, '0')}`
}

export function workoutVolume(workout: WorkoutSessionBundle): number {
  return workout.exercises
    .flatMap((exercise) => exercise.sets)
    .filter((set) => set.status === 'completed')
    .reduce((total, set) => total + (set.actual_reps ?? 0) * (set.actual_weight ?? 0), 0)
}

export function nextProgressionTarget(
  set: Pick<
    WorkoutSessionSet,
    | 'status'
    | 'target_reps'
    | 'target_min_reps'
    | 'target_max_reps'
    | 'target_weight'
    | 'weight_increment'
    | 'actual_reps'
    | 'actual_weight'
  >,
): ProgressionTarget {
  const targetWeight = Number(set.target_weight)
  const actualWeight = set.actual_weight === null ? null : Number(set.actual_weight)
  const achieved =
    set.status === 'completed' &&
    set.actual_reps !== null &&
    actualWeight !== null &&
    set.actual_reps >= set.target_reps &&
    actualWeight >= targetWeight

  if (!achieved) {
    return { reps: set.target_reps, weight: targetWeight, outcome: 'repeat' }
  }

  if (set.target_reps >= set.target_max_reps) {
    return {
      reps: set.target_min_reps,
      weight: Number((actualWeight + Number(set.weight_increment)).toFixed(2)),
      outcome: 'increase_weight',
    }
  }

  return {
    reps: Math.min(set.target_reps + 1, set.target_max_reps),
    weight: actualWeight,
    outcome: 'increase_reps',
  }
}
