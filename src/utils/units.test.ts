import { describe, expect, it } from 'vitest'

import { displayWeightToKilograms, kilogramsToDisplay } from './units'

describe('weight unit utilities', () => {
  it('converts kilograms and pounds for display and storage', () => {
    expect(kilogramsToDisplay(50, 'kg')).toBe(50)
    expect(kilogramsToDisplay(50, 'lb')).toBe(110.2)
    expect(displayWeightToKilograms(110.2, 'lb')).toBeCloseTo(49.99, 1)
  })
})
