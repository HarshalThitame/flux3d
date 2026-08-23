import { describe, expect, it } from 'vitest'
import {
  applyPackageOverrides,
  clampPackageOverrides,
  computeSuggestedPackage,
  istDatePlusDays,
} from '@/lib/shop/package-dimensions'

describe('computeSuggestedPackage', () => {
  it('returns defaults for an empty order', () => {
    const pkg = computeSuggestedPackage([], null, null)
    expect(pkg).toEqual({ weight_kg: 0.1, length_cm: 15, breadth_cm: 10, height_cm: 10 })
  })

  it('uses variant dimension overrides and multiplies weight by quantity', () => {
    const items = [
      {
        productId: 'p1',
        quantity: 2,
        variantCombination: { Size: 'Large' },
      },
    ]
    const products = [{ id: 'p1', default_dimensions: { length_mm: 100, width_mm: 50, height_mm: 30, weight_g: 200 } }]
    const variantRows = [
      {
        product_id: 'p1',
        option_name: 'Size',
        option_value: 'Large',
        dimensions: { length_mm: 250, width_mm: 150, height_mm: 80, weight_g: 400 },
      },
    ]
    const pkg = computeSuggestedPackage(items, products, variantRows)
    expect(pkg.weight_kg).toBe(0.8)
    expect(pkg.length_cm).toBe(25)
    expect(pkg.breadth_cm).toBe(15)
    expect(pkg.height_cm).toBe(10)
  })

  it('falls back to product default dimensions when no variant match exists', () => {
    const items = [{ productId: 'p1', quantity: 1 }]
    const products = [{ id: 'p1', default_dimensions: { length_mm: 120, width_mm: 60, height_mm: 40, weight_g: 300 } }]
    const pkg = computeSuggestedPackage(items, products, [])
    expect(pkg.weight_kg).toBe(0.3)
    expect(pkg.length_cm).toBe(15)
    expect(pkg.breadth_cm).toBe(10)
    expect(pkg.height_cm).toBe(10)
  })

  it('aggregates weight across items and keeps the largest dimensions', () => {
    const items = [
      { productId: 'p1', quantity: 1 },
      { productId: 'p2', quantity: 3 },
    ]
    const products = [
      { id: 'p1', default_dimensions: { length_mm: 300, width_mm: 200, height_mm: 100, weight_g: 500 } },
      { id: 'p2', default_dimensions: { length_mm: 100, width_mm: 100, height_mm: 50, weight_g: 150 } },
    ]
    const pkg = computeSuggestedPackage(items, products, [])
    expect(pkg.weight_kg).toBe(0.95)
    expect(pkg.length_cm).toBe(30)
    expect(pkg.breadth_cm).toBe(20)
    expect(pkg.height_cm).toBe(10)
  })
})

describe('clampPackageOverrides', () => {
  it('clamps out-of-range values into Shiprocket limits', () => {
    const result = clampPackageOverrides({ weight_kg: 99, length_cm: 0.5, breadth_cm: 45, height_cm: -10 })
    expect(result.weight_kg).toBe(30)
    expect(result.length_cm).toBe(1)
    expect(result.breadth_cm).toBe(45)
    expect(result.height_cm).toBeUndefined()
  })

  it('drops non-numeric input entirely', () => {
    expect(clampPackageOverrides({ weight_kg: 'abc', length_cm: null })).toEqual({})
    expect(clampPackageOverrides(null)).toEqual({})
  })
})

describe('applyPackageOverrides', () => {
  it('overrides only the provided fields', () => {
    const suggested = { weight_kg: 0.5, length_cm: 15, breadth_cm: 10, height_cm: 10 }
    const result = applyPackageOverrides(suggested, clampPackageOverrides({ weight_kg: 1.2 }))
    expect(result).toEqual({ weight_kg: 1.2, length_cm: 15, breadth_cm: 10, height_cm: 10 })
  })
})

describe('istDatePlusDays', () => {
  it('returns an ISO date string (YYYY-MM-DD)', () => {
    expect(istDatePlusDays(7)).toMatch(/^\d{4}-\d{2}-\d{2}$/)
  })
})
