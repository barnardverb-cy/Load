import type { Database } from '@/lib/database.types'

export type Exercise = Database['public']['Tables']['exercises']['Row']
export type WorkoutTemplate = Database['public']['Tables']['workout_templates']['Row']
export type TemplateExercise = Database['public']['Tables']['template_exercises']['Row']
export type TemplateExerciseSet = Database['public']['Tables']['template_exercise_sets']['Row']

export type TemplateSummary = WorkoutTemplate & {
  exerciseCount: number
}

export type TemplateExerciseWithExercise = TemplateExercise & {
  exercise: Exercise
  sets: TemplateExerciseSet[]
}

export type EditableTemplateSet = {
  id?: string
  min_reps: number
  max_reps: number
  starting_weight: number
  weight_increment: number
  rest_seconds: number
  progression_type: 'double_progression'
}

export type EditableTemplateExercise = {
  id?: string
  exercise_id: string
  exercise: Exercise
  sets: EditableTemplateSet[]
}
