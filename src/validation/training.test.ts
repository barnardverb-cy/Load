import { describe, expect, it } from 'vitest'

import { exerciseSchema, templateExerciseSchema, workoutTemplateSchema } from './training'

describe('exerciseSchema', () => {
  it('accepts and trims a valid exercise', () => {
    const result = exerciseSchema.safeParse({
      name: '  Romanian Deadlift  ',
      muscle_group: 'Hamstrings',
      equipment: 'Barbell',
      notes: 'Keep the bar close.',
    })

    expect(result.success).toBe(true)
    if (result.success) expect(result.data.name).toBe('Romanian Deadlift')
  })

  it('rejects an empty exercise name', () => {
    expect(
      exerciseSchema.safeParse({
        name: '   ',
        muscle_group: 'Hamstrings',
        equipment: 'Barbell',
      }).success,
    ).toBe(false)
  })
})

describe('workoutTemplateSchema', () => {
  it('accepts a named template', () => {
    expect(workoutTemplateSchema.safeParse({ name: 'Leg Day', description: '' }).success).toBe(true)
  })
})

describe('templateExerciseSchema', () => {
  const validSet = {
    min_reps: 10,
    max_reps: 15,
    starting_weight: 35,
    weight_increment: 2.5,
    rest_seconds: 120,
    progression_type: 'double_progression',
  }
  const validPrescription = {
    exercise_id: '8e704b16-4d70-4d86-aabc-4b7570e8f565',
    sets: [validSet],
  }

  it('accepts decimal weight increments', () => {
    expect(templateExerciseSchema.safeParse(validPrescription).success).toBe(true)
  })

  it('rejects a maximum below the minimum rep target', () => {
    expect(
      templateExerciseSchema.safeParse({
        ...validPrescription,
        sets: [{ ...validSet, min_reps: 15, max_reps: 10 }],
      }).success,
    ).toBe(false)
  })

  it('rejects zero and negative weight increments', () => {
    expect(
      templateExerciseSchema.safeParse({
        ...validPrescription,
        sets: [{ ...validSet, weight_increment: 0 }],
      }).success,
    ).toBe(false)
    expect(
      templateExerciseSchema.safeParse({
        ...validPrescription,
        sets: [{ ...validSet, weight_increment: -2.5 }],
      }).success,
    ).toBe(false)
  })

  it('accepts independently configured pyramid sets', () => {
    expect(
      templateExerciseSchema.safeParse({
        ...validPrescription,
        sets: [
          { ...validSet, min_reps: 10, max_reps: 12, starting_weight: 80 },
          { ...validSet, min_reps: 8, max_reps: 10, starting_weight: 100 },
          { ...validSet, min_reps: 6, max_reps: 8, starting_weight: 120 },
        ],
      }).success,
    ).toBe(true)
  })

  it('requires at least one set per exercise', () => {
    expect(templateExerciseSchema.safeParse({ ...validPrescription, sets: [] }).success).toBe(false)
  })
})
