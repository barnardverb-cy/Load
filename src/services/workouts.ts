import { supabase } from '@/lib/supabase'
import type {
  WorkoutSession,
  WorkoutSessionBundle,
  WorkoutSetUpdate,
  WorkoutSessionSet,
} from '@/types/workout'

const workoutSelect = `
  *,
  exercises:workout_session_exercises(
    *,
    sets:workout_session_sets(*)
  )
`

function sortWorkout(bundle: WorkoutSessionBundle): WorkoutSessionBundle {
  return {
    ...bundle,
    exercises: [...bundle.exercises]
      .sort((a, b) => a.position - b.position)
      .map((exercise) => ({
        ...exercise,
        sets: [...exercise.sets].sort((a, b) => a.position - b.position),
      })),
  }
}

export async function getActiveWorkout(): Promise<WorkoutSession | null> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select('*')
    .eq('status', 'in_progress')
    .maybeSingle()

  if (error) throw error
  return data
}

export async function getWorkout(id: string): Promise<WorkoutSessionBundle> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(workoutSelect)
    .eq('id', id)
    .single()

  if (error) throw error
  return sortWorkout(data as unknown as WorkoutSessionBundle)
}

export async function listWorkoutHistory(limit = 50): Promise<WorkoutSessionBundle[]> {
  const { data, error } = await supabase
    .from('workout_sessions')
    .select(workoutSelect)
    .in('status', ['completed', 'cancelled'])
    .order('completed_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return (data as unknown as WorkoutSessionBundle[]).map(sortWorkout)
}

export async function startWorkout(
  programId: string,
  restBetweenExercisesSeconds: number,
): Promise<string> {
  const { data, error } = await supabase.rpc('start_workout', {
    target_template_id: programId,
    target_rest_between_exercises_seconds: restBetweenExercisesSeconds,
  })
  if (error) throw error
  return data
}

export async function updateWorkoutSet(
  id: string,
  update: WorkoutSetUpdate,
): Promise<WorkoutSessionSet> {
  const completedAt = update.status === 'pending' ? null : new Date().toISOString()
  const { data, error } = await supabase
    .from('workout_session_sets')
    .update({
      status: update.status,
      actual_reps: update.actual_reps,
      actual_weight: update.actual_weight,
      completed_at: completedAt,
    })
    .eq('id', id)
    .select('*')
    .single()

  if (error) throw error
  return data
}

export async function updateWorkoutNotes(id: string, notes: string): Promise<void> {
  const { error } = await supabase
    .from('workout_sessions')
    .update({ notes: notes.trim() || null })
    .eq('id', id)
  if (error) throw error
}

export async function finishWorkout(id: string): Promise<void> {
  const { error } = await supabase.rpc('finish_workout', { target_session_id: id })
  if (error) throw error
}

export async function cancelWorkout(id: string): Promise<void> {
  const { error } = await supabase.rpc('cancel_workout', { target_session_id: id })
  if (error) throw error
}
