import { z } from 'zod'

export const MUSCLE_GROUPS = [
  'Chest',
  'Back',
  'Shoulders',
  'Biceps',
  'Triceps',
  'Glutes',
  'Hamstrings',
  'Quadriceps',
  'Calves',
  'Core',
  'Full Body',
  'Cardio',
  'Other',
] as const

export const EQUIPMENT_OPTIONS = [
  'Barbell',
  'Dumbbells',
  'Machine',
  'Cable',
  'Bodyweight',
  'Resistance Band',
  'Kettlebell',
  'Other',
] as const

export const exerciseSchema = z.object({
  name: z.string().trim().min(1, 'Exercise name is required').max(100),
  muscle_group: z.enum(MUSCLE_GROUPS),
  equipment: z.enum(EQUIPMENT_OPTIONS),
  notes: z.string().trim().max(1000).optional(),
})

export const workoutTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Program name is required').max(100),
  description: z.string().trim().max(500).optional(),
})

export const templateSetSchema = z
  .object({
    min_reps: z.coerce.number().int().min(1).max(100),
    max_reps: z.coerce.number().int().min(1).max(100),
    starting_weight: z.coerce.number().min(0).max(10000),
    weight_increment: z.coerce.number().positive().max(1000),
    rest_seconds: z.coerce.number().int().min(0).max(3600),
    progression_type: z.literal('double_progression'),
  })
  .refine((value) => value.max_reps >= value.min_reps, {
    message: 'Maximum reps must be at least the minimum reps',
    path: ['max_reps'],
  })

export const templateExerciseSchema = z.object({
  exercise_id: z.string().uuid(),
  sets: z.array(templateSetSchema).min(1, 'Add at least one set').max(20),
})

export type ExerciseInput = z.infer<typeof exerciseSchema>
export type WorkoutTemplateInput = z.infer<typeof workoutTemplateSchema>
