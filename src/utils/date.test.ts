import { describe, expect, it } from 'vitest'

import { dateDaysAgo, isoWeekNumber, localDateString } from './date'

describe('date utilities', () => {
  it('formats local calendar dates without a UTC shift', () => {
    expect(localDateString(new Date(2026, 7, 4, 23, 30))).toBe('2026-08-04')
    expect(dateDaysAgo(2, new Date(2026, 7, 4, 12))).toBe('2026-08-02')
  })

  it('calculates ISO week numbers', () => {
    expect(isoWeekNumber('2024-01-01')).toBe(1)
    expect(isoWeekNumber('2024-12-31')).toBe(1)
  })
})
