import { getMaterialById, layerHeightOptions } from '@/lib/quote/materials'
import type { ParsedModel, PriceBreakdown, QuoteConfig } from '@/lib/quote/types'

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits))
}

export function calculateInstantQuote(
  model: ParsedModel | null,
  config: QuoteConfig
): PriceBreakdown | null {
  if (!model) {
    return null
  }

  const material = getMaterialById(config.materialId)
  const layerHeight = layerHeightOptions.find((option) => option.value === config.layerHeight) ?? layerHeightOptions[1]
  const scaleFactor = config.scalePercent / 100
  const scaledVolumeMm3 = model.volumeMm3 * Math.pow(scaleFactor, 3)
  const scaledVolumeCm3 = scaledVolumeMm3 / 1000
  const shellFactor = 0.2
  const infillFactor = shellFactor + (config.infill / 100) * 0.8
  const supportFactor = config.supports ? 1.12 : 1
  const materialWeightGrams =
    scaledVolumeCm3 * material.density * infillFactor * material.multiplier * supportFactor

  const materialCost = materialWeightGrams * material.pricePerGram
  const geometryComplexity = Math.max(model.triangleCount / 50000, 0.65)
  const heightFactor = Math.max((model.dimensionsMm.z * scaleFactor) / 120, 0.7)
  const volumeTimeFactor = scaledVolumeCm3 / 18
  const infillTimeFactor = 0.75 + config.infill / 100
  const estimatedHours =
    Math.max(0.6, volumeTimeFactor * infillTimeFactor * layerHeight.multiplier * geometryComplexity * heightFactor)
  const timeCost = estimatedHours * material.machineRate
  const setupCost = 45
  const supportCost = config.supports ? 55 : 0
  const subtotal = materialCost + timeCost + setupCost + supportCost
  const profitMargin = subtotal * 0.22
  const total = subtotal + profitMargin

  return {
    scaledVolumeCm3: round(scaledVolumeCm3),
    materialWeightGrams: round(materialWeightGrams),
    materialCost: round(materialCost),
    estimatedHours: round(estimatedHours),
    timeCost: round(timeCost),
    setupCost: round(setupCost),
    supportCost: round(supportCost),
    subtotal: round(subtotal),
    profitMargin: round(profitMargin),
    total: round(total),
    dimensionsMm: {
      x: round(model.dimensionsMm.x * scaleFactor, 1),
      y: round(model.dimensionsMm.y * scaleFactor, 1),
      z: round(model.dimensionsMm.z * scaleFactor, 1),
    },
  }
}

