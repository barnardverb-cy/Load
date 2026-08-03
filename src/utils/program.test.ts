import { describe, expect, it } from 'vitest'

import type { EditableTemplateExercise } from '@/types/training'
import {
  cloneExercisePrescription,
  createExercisePrescriptionSnapshot,
  createProgramDetailsSnapshot,
} from './program'

const exercise: EditableTemplateExercise = {
  id: 'saved-row-id',
  exercise_id: '8e704b16-4d70-4d86-aabc-4b7570e8f565',
  exercise: {
    id: '8e704b16-4d70-4d86-aabc-4b7570e8f565',
    user_id: 'user-id',
    name: 'Hip Thrust',
    muscle_group: 'Glutes',
    equipment: 'Barbell',
    notes: null,
    is_archived: false,
    created_at: '2026-08-03T00:00:00Z',
    updated_at: '2026-08-03T00:00:00Z',
  },
  sets: [
    {
      id: 'saved-set-id',
      min_reps: 10,
      max_reps: 12,
      starting_weight: 80,
      weight_increment: 2.5,
      rest_seconds: 120,
      progression_type: 'double_progression',
    },
  ],
}

describe('program change snapshots', () => {
  it('ignores database row identifiers', () => {
    const changedIdentifiers = {
      ...exercise,
      id: 'new-row-id',
      sets: [{ ...exercise.sets[0]!, id: 'new-set-id' }],
    }

    expect(createExercisePrescriptionSnapshot([exercise])).toBe(
      createExercisePrescriptionSnapshot([changedIdentifiers]),
    )
  })

  it('detects a meaningful set change', () => {
    const changedWeight = {
      ...exercise,
      sets: [{ ...exercise.sets[0]!, starting_weight: 82.5 }],
    }

    expect(createExercisePrescriptionSnapshot([exercise])).not.toBe(
      createExercisePrescriptionSnapshot([changedWeight]),
    )
  })

  it('tracks program details separately from exercise prescriptions', () => {
    expect(createProgramDetailsSnapshot('Leg Day', 'Strength')).not.toBe(
      createProgramDetailsSnapshot('Leg Day', 'Hypertrophy'),
    )
  })

  it('creates an independent editable copy', () => {
    const cloned = cloneExercisePrescription([exercise])
    cloned[0]!.sets[0]!.starting_weight = 100

    expect(exercise.sets[0]!.starting_weight).toBe(80)
    expect(cloned[0]!.sets[0]!.starting_weight).toBe(100)
  })
})
