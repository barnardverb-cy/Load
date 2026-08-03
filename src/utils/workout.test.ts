import { describe, expect, it } from 'vitest'

import type { WorkoutSessionBundle } from '@/types/workout'
import {
  formatDuration,
  nextProgressionTarget,
  workoutDurationSeconds,
  workoutVolume,
} from './workout'

const progressionSet = {
  status: 'completed' as const,
  target_reps: 10,
  target_min_reps: 10,
  target_max_reps: 15,
  target_weight: 10,
  weight_increment: 2.5,
  actual_reps: 10,
  actual_weight: 10,
}

describe('workout utilities', () => {
  it('formats short and long durations', () => {
    expect(formatDuration(65)).toBe('1:05')
    expect(formatDuration(3665)).toBe('1:01:05')
  })

  it('calculates a bounded duration', () => {
    expect(
      workoutDurationSeconds('2026-08-03T00:00:00Z', null, Date.parse('2026-08-03T00:01:30Z')),
    ).toBe(90)
  })

  it('only includes completed sets in volume', () => {
    const workout = {
      exercises: [
        {
          sets: [
            { status: 'completed', actual_reps: 10, actual_weight: 20 },
            { status: 'skipped', actual_reps: null, actual_weight: null },
          ],
        },
      ],
    } as WorkoutSessionBundle
    expect(workoutVolume(workout)).toBe(200)
  })

  it('adds one rep after the current target is achieved', () => {
    expect(nextProgressionTarget(progressionSet)).toEqual({
      reps: 11,
      weight: 10,
      outcome: 'increase_reps',
    })
  })

  it('adds weight and resets reps after the top target is achieved', () => {
    expect(nextProgressionTarget({ ...progressionSet, target_reps: 15, actual_reps: 15 })).toEqual({
      reps: 10,
      weight: 12.5,
      outcome: 'increase_weight',
    })
  })

  it('repeats the target after a miss or skipped set', () => {
    expect(nextProgressionTarget({ ...progressionSet, actual_reps: 9 })).toEqual({
      reps: 10,
      weight: 10,
      outcome: 'repeat',
    })
    expect(
      nextProgressionTarget({
        ...progressionSet,
        status: 'skipped',
        actual_reps: null,
        actual_weight: null,
      }),
    ).toEqual({ reps: 10, weight: 10, outcome: 'repeat' })
  })
})
