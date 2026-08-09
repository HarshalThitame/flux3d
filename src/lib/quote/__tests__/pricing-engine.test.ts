import { describe, expect, it } from 'vitest'
import { formatDurationMinutes, getPostProcessingCharge } from '../pricing-engine'
import { FALLBACK_SETTINGS } from '@/lib/settings-fallback'
import type { ParsedModel, QuoteConfig, QuoteMaterial } from '@/lib/quote/types'

describe('formatDurationMinutes', () => {
  it('formats whole hours', () => {
    expect(formatDurationMinutes(120)).toBe('2h 00m')
  })

  it('formats hours and minutes', () => {
    expect(formatDurationMinutes(150)).toBe('2h 30m')
  })

  it('formats minutes only', () => {
    expect(formatDurationMinutes(45)).toBe('0h 45m')
  })

  it('rounds fractional minutes', () => {
    expect(formatDurationMinutes(90.7)).toBe('1h 31m')
  })

  it('handles zero', () => {
    expect(formatDurationMinutes(0)).toBe('0h 00m')
  })

  it('handles negative by clamping to 0', () => {
    expect(formatDurationMinutes(-30)).toBe('0h 00m')
  })

  it('pads minutes with leading zero', () => {
    expect(formatDurationMinutes(61)).toBe('1h 01m')
  })

  it('handles large values', () => {
    expect(formatDurationMinutes(1440)).toBe('24h 00m')
  })
})

describe('getPostProcessingCharge', () => {
  it('uses FALLBACK_SETTINGS multipliers by default', () => {
    const charge = getPostProcessingCharge('sanded', 100, 1.2)
    const expectedMultiplier = FALLBACK_SETTINGS.postProcessingMultipliers['sanded']
    expect(charge).toBeCloseTo(100 * expectedMultiplier * 1.2)
  })

  it('returns 0 for none level', () => {
    const charge = getPostProcessingCharge('none', 100, 1.0)
    expect(charge).toBe(0)
  })

  it('respects custom multipliers', () => {
    const charge = getPostProcessingCharge('sanded', 100, 1.0, { none: 0, sanded: 0.5, 'sanded-painted': 1.0 })
    expect(charge).toBe(50)
  })

  it('scales with difficulty factor', () => {
    const low = getPostProcessingCharge('sanded', 100, 1.0)
    const high = getPostProcessingCharge('sanded', 100, 2.0)
    expect(high).toBe(low * 2)
  })
})

describe('calculateInstantQuote', () => {
  it('returns null when model is null', async () => {
    const { calculateInstantQuote } = await import('../pricing-engine')
    expect(calculateInstantQuote(null, {} as QuoteConfig, [], 30)).toBeNull()
  })

  it('returns null when material is not found', async () => {
    const { calculateInstantQuote } = await import('../pricing-engine')
    const config = { materialId: 'nonexistent', color: 'red', infill: 20, layerHeight: 0.2, quantity: 1, postProcessingLevel: 'none' as const, supports: false }
    const result = calculateInstantQuote(null, config, [])
    expect(result).toBeNull()
  })

  it('calculates pricing for a valid model and material', async () => {
    const { calculateInstantQuote } = await import('../pricing-engine')
    const model = {
      volumeMm3: 20000, dimensionsMm: { x: 20, y: 15, z: 10 }, fileName: 'cube.stl', fileSize: 1000, extension: 'stl', triangleCount: 100, suggestedMaterialId: 'pla',
      object: null,
    } as unknown as ParsedModel
    const material: QuoteMaterial = {
      id: 'pla', name: 'PLA+', icon: '🧩', summary: '', density: 1.24, pricePerGram: 2.80, machineRate: 180,
      multiplier: 1, recommendedFor: '', properties: { strength: 'Medium', flexibility: 'Low', tempResistance: 'Low', difficulty: 'Easy' },
      colors: [{ name: 'Red' }], difficultyFactor: 1,
      keyProperties: [], bestFor: [], difficultyLevel: 'Easy', heatResistance: 'Low',
      strengthRating: 'Medium', finishQuality: 'Good',
    }
    const config: QuoteConfig = { materialId: 'pla', color: 'Red', infill: 20, layerHeight: 0.2, quantity: 1, postProcessingLevel: 'none', supports: false }

    const result = calculateInstantQuote(model, config, [material], {
      overheadPercentage: 15, marginPercentage: 30, materialMarkupPercent: 0,
      printSpeedGramsPerHour: 40, postProcessingMultipliers: { none: 0, sanded: 0.15, 'sanded-painted': 0.35 },
      deliveryChargeThreshold: 349, defaultDeliveryCharge: 50,
      cartDiscountEnabled: false, cartDiscountTiers: [], minimumOrderValue: 0, gstInclusivePricing: true,
    })

    expect(result).not.toBeNull()
    if (result) {
      expect(result.materialCost).toBeGreaterThan(0)
      expect(result.machineCost).toBeGreaterThan(0)
      expect(result.grandTotal).toBeGreaterThan(0)
      expect(result.estimatedHours).toBeGreaterThan(0)
    }
  })

  it('supports legacy numeric margin parameter', async () => {
    const { calculateInstantQuote } = await import('../pricing-engine')
    const model = {
      volumeMm3: 10000, dimensionsMm: { x: 10, y: 10, z: 10 }, fileName: 'test.stl', fileSize: 1000, extension: 'stl', triangleCount: 100, suggestedMaterialId: 'abs',
      object: null,
    } as unknown as ParsedModel
    const material: QuoteMaterial = {
      id: 'abs', name: 'ABS', icon: '', summary: '', density: 1.04, pricePerGram: 3.5, machineRate: 200,
      multiplier: 1, recommendedFor: '', properties: { strength: 'High', flexibility: 'Medium', tempResistance: 'Medium', difficulty: 'Medium' },
      colors: [{ name: 'White' }], difficultyFactor: 1.2,
      keyProperties: [], bestFor: [], difficultyLevel: 'Medium', heatResistance: 'Medium',
      strengthRating: 'High', finishQuality: 'Good',
    }
    const config: QuoteConfig = { materialId: 'abs', color: 'White', infill: 50, layerHeight: 0.1, quantity: 2, postProcessingLevel: 'sanded', supports: true }
    const result = calculateInstantQuote(model, config, [material], 30)
    expect(result).not.toBeNull()
    if (result) {
      expect(result.quantity).toBe(2)
    }
  })

  it('uses the layerHeight multiplier from layerHeightOptions, not 0.2 / value', async () => {
    const { calculateInstantQuote } = await import('../pricing-engine')
    const model = {
      volumeMm3: 20000, dimensionsMm: { x: 20, y: 15, z: 10 }, fileName: 'cube.stl', fileSize: 1000, extension: 'stl', triangleCount: 100, suggestedMaterialId: 'pla',
      object: null,
    } as unknown as ParsedModel
    const material: QuoteMaterial = {
      id: 'pla', name: 'PLA+', icon: '🧩', summary: '', density: 1.24, pricePerGram: 2.8, machineRate: 180,
      multiplier: 1, recommendedFor: '', properties: { strength: 'Medium', flexibility: 'Low', tempResistance: 'Low', difficulty: 'Easy' },
      colors: [{ name: 'Red' }], difficultyFactor: 1,
      keyProperties: [], bestFor: [], difficultyLevel: 'Easy', heatResistance: 'Low',
      strengthRating: 'Medium', finishQuality: 'Good',
    }
    const settings = {
      overheadPercentage: 10, marginPercentage: 20, materialMarkupPercent: 0,
      printSpeedGramsPerHour: 40, postProcessingMultipliers: { none: 0, sanded: 0.15, 'sanded-painted': 0.35 },
      deliveryChargeThreshold: 349, defaultDeliveryCharge: 50,
      cartDiscountEnabled: false, cartDiscountTiers: [], minimumOrderValue: 100, gstInclusivePricing: true,
    }

    const standard = calculateInstantQuote(model, { ...createConfig(0.2) }, [material], settings)
    const high = calculateInstantQuote(model, { ...createConfig(0.12) }, [material], settings)

    expect(standard).not.toBeNull()
    expect(high).not.toBeNull()
    if (standard && high) {
      // layerHeightOptions multiplier: 0.12mm = 1.3x the 0.2mm machine time
      expect(high.estimatedMinutesPerUnit).toBeCloseTo(standard.estimatedMinutesPerUnit * 1.3, 4)
      // Legacy behavior (0.2 / 0.12 = 1.6667) must NOT be used
      expect(high.estimatedMinutesPerUnit).toBeLessThan(standard.estimatedMinutesPerUnit * 1.67)
    }

    function createConfig(layerHeight: number): QuoteConfig {
      return { materialId: 'pla', color: 'Red', infill: 20, layerHeight, quantity: 1, postProcessingLevel: 'none', supports: false }
    }
  })

  it('applies minimum order value and reports priceBeforeMinimum', async () => {
    const { calculateInstantQuote } = await import('../pricing-engine')
    const model = {
      volumeMm3: 5000, dimensionsMm: { x: 17, y: 17, z: 17 }, fileName: 'tiny.stl', fileSize: 500, extension: 'stl', triangleCount: 50, suggestedMaterialId: 'pla',
      object: null,
    } as unknown as ParsedModel
    const material: QuoteMaterial = {
      id: 'pla', name: 'PLA+', icon: '🧩', summary: '', density: 1.24, pricePerGram: 2.8, machineRate: 180,
      multiplier: 1, recommendedFor: '', properties: { strength: 'Medium', flexibility: 'Low', tempResistance: 'Low', difficulty: 'Easy' },
      colors: [{ name: 'Red' }], difficultyFactor: 1,
      keyProperties: [], bestFor: [], difficultyLevel: 'Easy', heatResistance: 'Low',
      strengthRating: 'Medium', finishQuality: 'Good',
    }
    const config: QuoteConfig = { materialId: 'pla', color: 'Red', infill: 20, layerHeight: 0.2, quantity: 1, postProcessingLevel: 'none', supports: false }
    const settings = {
      overheadPercentage: 10, marginPercentage: 20, materialMarkupPercent: 0,
      printSpeedGramsPerHour: 40, postProcessingMultipliers: { none: 0, sanded: 0.15, 'sanded-painted': 0.35 },
      deliveryChargeThreshold: 349, defaultDeliveryCharge: 50,
      cartDiscountEnabled: false, cartDiscountTiers: [], minimumOrderValue: 100, gstInclusivePricing: true,
    }

    const result = calculateInstantQuote(model, config, [material], settings)
    expect(result).not.toBeNull()
    if (result) {
      expect(result.minimumOrderValue).toBe(100)
      expect(result.finalPrice).toBeGreaterThanOrEqual(100)
      expect(result.priceBeforeMinimum).toBeLessThanOrEqual(result.finalPrice)
    }
  })

  it('does not apply markup when materialMarkupPercent is 0', async () => {
    const { calculateInstantQuote } = await import('../pricing-engine')
    const model = {
      volumeMm3: 10000, dimensionsMm: { x: 10, y: 10, z: 10 }, fileName: 'cube.stl', fileSize: 1000, extension: 'stl', triangleCount: 100, suggestedMaterialId: 'pla',
      object: null,
    } as unknown as ParsedModel
    const material: QuoteMaterial = {
      id: 'pla', name: 'PLA+', icon: '🧩', summary: '', density: 1.24, pricePerGram: 2.8, machineRate: 180,
      multiplier: 1, recommendedFor: '', properties: { strength: 'Medium', flexibility: 'Low', tempResistance: 'Low', difficulty: 'Easy' },
      colors: [{ name: 'Red' }], difficultyFactor: 1,
      keyProperties: [], bestFor: [], difficultyLevel: 'Easy', heatResistance: 'Low',
      strengthRating: 'Medium', finishQuality: 'Good',
    }
    const config: QuoteConfig = { materialId: 'pla', color: 'Red', infill: 100, layerHeight: 0.2, quantity: 1, postProcessingLevel: 'none', supports: false }
    const settings = {
      overheadPercentage: 0, marginPercentage: 0, materialMarkupPercent: 0,
      printSpeedGramsPerHour: 40, postProcessingMultipliers: { none: 0, sanded: 0.15, 'sanded-painted': 0.35 },
      deliveryChargeThreshold: 349, defaultDeliveryCharge: 50,
      cartDiscountEnabled: false, cartDiscountTiers: [], minimumOrderValue: 0, gstInclusivePricing: true,
    }

    const result = calculateInstantQuote(model, config, [material], settings)
    expect(result).not.toBeNull()
    if (result) {
      // 10 cm3 * 1.24 g/cm3 = 12.4 g solid; 100% infill -> 12.4 g; markup 0% -> 12.4 * 2.8 = 34.72
      expect(result.materialCost).toBeCloseTo(34.72, 2)
    }
  })
})
