import { describe, expect, it } from 'vitest'

import { dailyLogSchema, weeklyCheckInSchema } from './health'

describe('health tracking validation', () => {
  it('normalizes empty daily fields to null', () => {
    const result = dailyLogSchema.parse({
      log_date: '2026-08-04',
      calories: '',
      protein_g: '',
      water_l: '',
      steps: '',
      sleep_hours: '',
      notes: '',
    })
    expect(result.calories).toBeNull()
    expect(result.sleep_hours).toBeNull()
  })

  it('requires at least one weekly measurement', () => {
    const empty = weeklyCheckInSchema.safeParse({
      check_in_date: '2026-08-04',
      weight_kg: '',
      body_fat_percentage: '',
      waist_inches: '',
      chest_inches: '',
      hips_inches: '',
      arms_inches: '',
      quads_inches: '',
      notes: '',
    })
    expect(empty.success).toBe(false)

    const valid = weeklyCheckInSchema.safeParse({
      check_in_date: '2026-08-04',
      weight_kg: 58.8,
      body_fat_percentage: '',
      waist_inches: '',
      chest_inches: '',
      hips_inches: '',
      arms_inches: '',
      quads_inches: '',
      notes: '',
    })
    expect(valid.success).toBe(true)
  })
})
