import type { Database } from '@/lib/database.types'

export type WorkoutSession = Database['public']['Tables']['workout_sessions']['Row']
export type WorkoutSessionExercise =
  Database['public']['Tables']['workout_session_exercises']['Row']
export type WorkoutSessionSet = Database['public']['Tables']['workout_session_sets']['Row']
export type WorkoutSetStatus = WorkoutSessionSet['status']

export type WorkoutSessionExerciseWithSets = WorkoutSessionExercise & {
  sets: WorkoutSessionSet[]
}

export type WorkoutSessionBundle = WorkoutSession & {
  exercises: WorkoutSessionExerciseWithSets[]
}

export type WorkoutSetUpdate = {
  status: WorkoutSetStatus
  actual_reps: number | null
  actual_weight: number | null
}
