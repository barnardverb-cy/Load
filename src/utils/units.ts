export type WeightUnit = 'kg' | 'lb'

export function kilogramsToDisplay(weightKg: number, unit: WeightUnit): number {
  return unit === 'lb' ? Number((weightKg * 2.2046226218).toFixed(1)) : Number(weightKg.toFixed(2))
}

export function displayWeightToKilograms(weight: number, unit: WeightUnit): number {
  return unit === 'lb' ? Number((weight / 2.2046226218).toFixed(2)) : Number(weight.toFixed(2))
}
