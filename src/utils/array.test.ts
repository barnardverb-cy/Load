import { describe, expect, it } from 'vitest'

import { moveItem } from './array'

describe('moveItem', () => {
  it('moves an item without mutating the original array', () => {
    const original = ['Hip Thrust', 'RDL', 'Goblet Squat']
    const reordered = moveItem(original, 1, 0)

    expect(reordered).toEqual(['RDL', 'Hip Thrust', 'Goblet Squat'])
    expect(original).toEqual(['Hip Thrust', 'RDL', 'Goblet Squat'])
  })

  it('returns an unchanged copy for an invalid position', () => {
    const original = ['RDL']
    const result = moveItem(original, 0, 2)

    expect(result).toEqual(original)
    expect(result).not.toBe(original)
  })
})
