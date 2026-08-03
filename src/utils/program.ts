import type { EditableTemplateExercise } from '@/types/training'

export function cloneExercisePrescription(
  exercises: readonly EditableTemplateExercise[],
): EditableTemplateExercise[] {
  return exercises.map((exercise) => ({
    id: exercise.id,
    exercise_id: exercise.exercise_id,
    exercise: { ...exercise.exercise },
    sets: exercise.sets.map((set) => ({ ...set })),
  }))
}

export function createProgramDetailsSnapshot(name: string, description: string): string {
  return JSON.stringify({ name, description })
}

export function createExercisePrescriptionSnapshot(
  exercises: readonly EditableTemplateExercise[],
): string {
  return JSON.stringify({
    exercises: exercises.map((exercise) => ({
      exercise_id: exercise.exercise_id,
      sets: exercise.sets.map((set) => ({
        min_reps: set.min_reps,
        max_reps: set.max_reps,
        starting_weight: set.starting_weight,
        weight_increment: set.weight_increment,
        rest_seconds: set.rest_seconds,
        progression_type: set.progression_type,
      })),
    })),
  })
}
