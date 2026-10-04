import { describe, expect, it } from 'vitest'
import { exceedsStandardQuoteBuildVolume, isQuoteScaleAllowed, normalizeQuoteScale, scaleModelForQuote } from '../scale'
import { calculateQuotePricing } from '../pricing-waterfall'
import type { ParsedModel, QuoteMaterial } from '../types'

const settings = {
  quoteScaleMinPercent: 25,
  quoteScaleMaxPercent: 200,
  quoteScaleDefaultPercent: 100,
  quoteScaleStepPercent: 5,
}

const model = {
  fileName: 'cube.stl', fileSize: 100, extension: 'stl', object: null,
  dimensionsMm: { x: 20, y: 20, z: 20 }, volumeMm3: 8000, surfaceAreaMm2: 2400,
  supportVolumeMm3: 400, triangleCount: 12, suggestedMaterialId: 'pla', requiresReview: false,
} as unknown as ParsedModel

const material: QuoteMaterial = {
  id: 'pla', name: 'PLA', icon: '◼', summary: '', density: 1.24, pricePerGram: 2,
  machineRate: 120, multiplier: 1, recommendedFor: '', properties: { strength: '', flexibility: '', tempResistance: '', difficulty: '' },
  colors: [{ name: 'White' }], difficultyFactor: 1,
}

const pricingSettings = {
  overheadPercentage: 0, marginPercentage: 0, materialMarkupPercent: 0, printSpeedGramsPerHour: 40,
  postProcessingMultipliers: { none: 0, sanded: 0.15, 'sanded-painted': 0.35 }, deliveryChargeThreshold: 0,
  defaultDeliveryCharge: 0, cartDiscountEnabled: false, cartDiscountTiers: [], minimumOrderValue: 0, gstInclusivePricing: true,
  ...settings,
}

describe('instant quote scale', () => {
  it('clamps and aligns scale percentages to the admin-configured step', () => {
    expect(normalizeQuoteScale(23, settings)).toBe(25)
    expect(normalizeQuoteScale(103, settings)).toBe(105)
    expect(normalizeQuoteScale(999, settings)).toBe(200)
  })

  it('accepts only values that the quote API can honour exactly', () => {
    expect(isQuoteScaleAllowed(25, settings)).toBe(true)
    expect(isQuoteScaleAllowed(105, settings)).toBe(true)
    expect(isQuoteScaleAllowed(103, settings)).toBe(false)
    expect(isQuoteScaleAllowed(205, settings)).toBe(false)
  })

  it('uniformly scales dimensions, volume, surface, and supports', () => {
    const scaled = scaleModelForQuote(model, { scalePercent: 50 }, settings)
    expect(scaled.dimensionsMm).toEqual({ x: 10, y: 10, z: 10 })
    expect(scaled.volumeMm3).toBe(1000)
    expect(scaled.surfaceAreaMm2).toBe(600)
    expect(scaled.supportVolumeMm3).toBe(50)
  })

  it('uses scaled dimensions for automatic build-volume eligibility', () => {
    expect(exceedsStandardQuoteBuildVolume(model.dimensionsMm, { scalePercent: 100 }, settings)).toBe(false)
    expect(exceedsStandardQuoteBuildVolume({ x: 120, y: 120, z: 120 }, { scalePercent: 200 }, settings)).toBe(true)
  })

  it('prices the scaled manufacturing geometry rather than adding a scale fee', () => {
    const base = calculateQuotePricing(model, { materialId: 'pla', color: 'White', infill: 20, layerHeight: 0.2, quantity: 1, supports: false, postProcessingLevel: 'none', scalePercent: 100 }, [material], pricingSettings)
    const double = calculateQuotePricing(model, { materialId: 'pla', color: 'White', infill: 20, layerHeight: 0.2, quantity: 1, supports: false, postProcessingLevel: 'none', scalePercent: 200 }, [material], pricingSettings)
    expect(base).not.toBeNull()
    expect(double).not.toBeNull()
    expect(double!.dimensionsMm.x).toBe(base!.dimensionsMm.x * 2)
    expect(double!.baseWeightGrams).toBeCloseTo(base!.baseWeightGrams * 8, 6)
    expect(double!.materialWeightGrams).toBeGreaterThan(base!.materialWeightGrams)
    expect(double!.grandTotal).toBeGreaterThan(base!.grandTotal)
  })
})
