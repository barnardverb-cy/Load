import { z } from 'zod'

const nullableNumber = (minimum: number, maximum: number, message: string) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : Number(value)),
    z.number(message).min(minimum, message).max(maximum, message).nullable(),
  )

const nullableInteger = (minimum: number, maximum: number, message: string) =>
  z.preprocess(
    (value) => (value === '' || value === null || value === undefined ? null : Number(value)),
    z.number(message).int(message).min(minimum, message).max(maximum, message).nullable(),
  )

export const fitnessGoalsSchema = z.object({
  starting_weight_kg: nullableNumber(0, 1000, 'Enter a valid starting weight.'),
  goal_weight_kg: nullableNumber(0, 1000, 'Enter a valid goal weight.'),
  starting_body_fat_percentage: nullableNumber(0, 100, 'Body fat must be between 0 and 100.'),
  goal_body_fat_percentage: nullableNumber(0, 100, 'Body fat must be between 0 and 100.'),
  daily_calorie_goal: nullableInteger(0, 20000, 'Enter a valid calorie goal.'),
  daily_protein_goal_g: nullableNumber(0, 2000, 'Enter a valid protein goal.'),
  daily_water_goal_l: nullableNumber(0, 100, 'Enter a valid water goal.'),
  daily_steps_goal: nullableInteger(0, 200000, 'Enter a valid steps goal.'),
})

export const dailyLogSchema = z.object({
  log_date: z.iso.date('Choose a valid date.'),
  calories: nullableInteger(0, 50000, 'Enter valid calories.'),
  protein_g: nullableNumber(0, 5000, 'Enter valid protein.'),
  water_l: nullableNumber(0, 100, 'Enter valid water intake.'),
  steps: nullableInteger(0, 500000, 'Enter valid steps.'),
  sleep_hours: nullableNumber(0, 24, 'Sleep must be between 0 and 24 hours.'),
  notes: z.string().trim().max(2000, 'Notes must be 2,000 characters or fewer.'),
})

export const weeklyCheckInSchema = z
  .object({
    check_in_date: z.iso.date('Choose a valid date.'),
    weight_kg: nullableNumber(0, 1000, 'Enter a valid weight.'),
    body_fat_percentage: nullableNumber(0, 100, 'Body fat must be between 0 and 100.'),
    waist_inches: nullableNumber(0, 200, 'Enter a valid waist measurement.'),
    chest_inches: nullableNumber(0, 200, 'Enter a valid chest measurement.'),
    hips_inches: nullableNumber(0, 200, 'Enter a valid hips measurement.'),
    arms_inches: nullableNumber(0, 100, 'Enter a valid arms measurement.'),
    quads_inches: nullableNumber(0, 100, 'Enter a valid quads measurement.'),
    notes: z.string().trim().max(2000, 'Notes must be 2,000 characters or fewer.'),
  })
  .refine(
    (value) =>
      [
        value.weight_kg,
        value.body_fat_percentage,
        value.waist_inches,
        value.chest_inches,
        value.hips_inches,
        value.arms_inches,
        value.quads_inches,
      ].some((item) => item !== null),
    { message: 'Add at least one measurement.' },
  )

export type FitnessGoalsForm = z.input<typeof fitnessGoalsSchema>
export type DailyLogForm = z.input<typeof dailyLogSchema>
export type WeeklyCheckInForm = z.input<typeof weeklyCheckInSchema>
