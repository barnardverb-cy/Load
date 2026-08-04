import { describe, expect, it } from 'vitest'

import type { DailyLog } from '@/types/health'
import type { WorkoutSessionBundle } from '@/types/workout'

import {
  currentStreak,
  dailyAdherence,
  estimatedOneRepMax,
  strengthImprovements,
  weightSummary,
} from './analytics'

// Build a local YYYY-MM-DD string (matching how DailyLog.log_date is stored),
// offset by a number of days from today. Using local time — not UTC — keeps the
// inputs in the same calendar frame the analytics functions compare against.
function localDateString(offsetDays = 0): string {
  const date = new Date()
  date.setHours(12, 0, 0, 0)
  date.setDate(date.getDate() - offsetDays)
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

function makeWorkout(overrides: Partial<WorkoutSessionBundle>): WorkoutSessionBundle {
  return {
    id: 'session',
    user_id: 'user',
    template_id: 'template',
    program_name: 'Session',
    status: 'completed',
    started_at: '2026-01-01T10:00:00Z',
    completed_at: '2026-01-01T10:30:00Z',
    notes: null,
    rest_between_exercises_seconds: 0,
    created_at: '2026-01-01T10:00:00Z',
    updated_at: '2026-01-01T10:00:00Z',
    exercises: [],
    ...overrides,
  }
}

describe('weightSummary', () => {
  it('returns nulls when data is missing', () => {
    const summary = weightSummary(null, null, null)
    expect(summary.changeFromStart).toBeNull()
    expect(summary.goalProgressPercent).toBeNull()
    expect(summary.goalAttained).toBe(false)
  })

  it('computes change from starting weight', () => {
    const summary = weightSummary(82, 85, 78)
    expect(summary.changeFromStart).toBe(-3)
    expect(summary.changePercentFromStart).toBe(-4)
    expect(summary.goalDelta).toBe(4)
  })

  it('reports an attained goal', () => {
    expect(weightSummary(78, 85, 80).goalAttained).toBe(true)
    expect(weightSummary(96, 85, 95).goalAttained).toBe(true)
    expect(weightSummary(82, 85, 80).goalAttained).toBe(false)
  })

  it('clamps goal progress to 0–100', () => {
    // Gain goal (85kg → 90kg): 95kg overshoots the goal, 80kg is below the start.
    expect(weightSummary(95, 85, 90).goalProgressPercent).toBe(100)
    expect(weightSummary(80, 85, 90).goalProgressPercent).toBe(0)
  })
})

describe('currentStreak', () => {
  it('counts consecutive days ending today', () => {
    const today = localDateString(0)
    const yesterday = localDateString(1)
    const twoDaysAgo = localDateString(2)
    expect(currentStreak([today, yesterday, twoDaysAgo])).toBe(3)
  })

  it('does not reset the streak when today is not yet logged', () => {
    const yesterday = localDateString(1)
    const twoDaysAgo = localDateString(2)
    expect(currentStreak([yesterday, twoDaysAgo])).toBe(2)
  })

  it('returns zero when nothing was logged recently', () => {
    expect(currentStreak(['2020-01-01'])).toBe(0)
  })
})

describe('dailyAdherence', () => {
  it('flags the most recent seven days', () => {
    const today = localDateString(0)
    const adherence = dailyAdherence([{ log_date: today } as DailyLog], 7)
    expect(adherence).toHaveLength(7)
    expect(adherence[adherence.length - 1]!.logged).toBe(true)
    expect(adherence[0]!.logged).toBe(false)
  })
})

describe('estimatedOneRepMax', () => {
  it('uses the Epley formula', () => {
    expect(estimatedOneRepMax(100, 5)).toBeCloseTo(116.7, 1)
  })

  it('returns zero for no reps', () => {
    expect(estimatedOneRepMax(100, 0)).toBe(0)
  })
})

describe('strengthImprovements', () => {
  it('compares the latest session against the previous one per exercise', () => {
    const earlier = makeWorkout({
      id: 'earlier',
      completed_at: '2026-01-01T10:30:00Z',
      exercises: [
        {
          id: 'e1',
          session_id: 'earlier',
          exercise_id: 'ex',
          template_exercise_id: null,
          exercise_name: 'Bench Press',
          muscle_group: 'Chest',
          equipment: 'Barbell',
          position: 1,
          notes: null,
          created_at: '',
          updated_at: '',
          sets: [
            {
              id: 's1',
              session_exercise_id: 'e1',
              template_exercise_set_id: null,
              position: 1,
              target_min_reps: 5,
              target_max_reps: 8,
              target_reps: 5,
              target_weight: 80,
              weight_increment: 2.5,
              rest_seconds: 0,
              actual_reps: 5,
              actual_weight: 80,
              status: 'completed',
              completed_at: '',
              created_at: '',
              updated_at: '',
            },
          ],
        },
      ],
    })
    const later = makeWorkout({
      id: 'later',
      completed_at: '2026-02-01T10:30:00Z',
      exercises: [
        {
          id: 'e2',
          session_id: 'later',
          exercise_id: 'ex',
          template_exercise_id: null,
          exercise_name: 'Bench Press',
          muscle_group: 'Chest',
          equipment: 'Barbell',
          position: 1,
          notes: null,
          created_at: '',
          updated_at: '',
          sets: [
            {
              id: 's2',
              session_exercise_id: 'e2',
              template_exercise_set_id: null,
              position: 1,
              target_min_reps: 5,
              target_max_reps: 8,
              target_reps: 5,
              target_weight: 85,
              weight_increment: 2.5,
              rest_seconds: 0,
              actual_reps: 5,
              actual_weight: 85,
              status: 'completed',
              completed_at: '',
              created_at: '',
              updated_at: '',
            },
          ],
        },
      ],
    })

    const improvements = strengthImprovements([later, earlier])
    expect(improvements).toHaveLength(1)
    expect(improvements[0]!.exercise).toBe('Bench Press')
    expect(improvements[0]!.deltaOneRepMax).toBeCloseTo(5.9, 1)
    expect(improvements[0]!.percent).toBeGreaterThan(0)
  })

  it('ignores exercises without a previous baseline', () => {
    const onlyWorkout = makeWorkout({ id: 'only' })
    expect(strengthImprovements([onlyWorkout])).toHaveLength(0)
  })
})
