import { getMaterialById, layerHeightOptions } from '@/lib/quote/materials'
import type { ParsedModel, PriceBreakdown, QuoteConfig, QuoteMaterial, PostProcessingLevel } from '@/lib/quote/types'

const BASE_SANDING_COST = 120

const POST_PROCESSING_COSTS: Record<PostProcessingLevel, number> = {
  none: 0,
  sanded: BASE_SANDING_COST,
  'sanded-painted': BASE_SANDING_COST,
}

export const postProcessingOptions: Array<{
  value: PostProcessingLevel
  label: string
  description: string
  cost: number
}> = [
  { value: 'none', label: 'None', description: 'Raw part, no finishing work.', cost: POST_PROCESSING_COSTS.none },
  { value: 'sanded', label: 'Sanded', description: 'Sanding for a smoother finish.', cost: POST_PROCESSING_COSTS.sanded },
  { value: 'sanded-painted', label: 'Sanded + Painted', description: 'Sanding, primer, and paint-ready finishing.', cost: POST_PROCESSING_COSTS['sanded-painted'] },
]

function roundToNearestFive(value: number) {
  return Math.round(value / 5) * 5
}

function getQuantityDiscountPercent(quantity: number) {
  if (quantity >= 11) return 15
  if (quantity >= 6) return 10
  if (quantity >= 3) return 5
  return 0
}

function getPostProcessingCostPerUnit(level: PostProcessingLevel, difficultyFactor: number) {
  if (level === 'none') return 0
  const multiplier = level === 'sanded-painted' ? difficultyFactor + 0.5 : difficultyFactor
  return BASE_SANDING_COST * multiplier
}

export function formatDurationMinutes(totalMinutes: number) {
  const roundedMinutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(roundedMinutes / 60)
  const minutes = roundedMinutes % 60

  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

export function calculateInstantQuote(
  model: ParsedModel | null,
  config: QuoteConfig,
  materials?: QuoteMaterial[]
): PriceBreakdown | null {
  if (!model) {
    return null
  }

  const material = getMaterialById(config.materialId, materials)
  if (!material) {
    return null
  }

  const layerHeight = layerHeightOptions.find((option) => option.value === config.layerHeight) ?? layerHeightOptions[0]
  if (!layerHeight) {
    return null
  }

  const quantity = Math.max(1, Math.floor(config.quantity || 1))

  const scaledVolumeCm3 = model.volumeMm3 / 1000

  // Treat the parsed geometry volume as the solid reference weight for a single unit.
  const baseWeightGrams = scaledVolumeCm3 * material.density
  const infillMultiplier = 0.6 + 0.4 * (config.infill / 100)
  const materialUsageGramsPerUnit = baseWeightGrams * infillMultiplier
  const materialUsageGramsTotal = materialUsageGramsPerUnit * quantity

  const materialRatePerKg = material.pricePerGram * 1000
  const materialCostPerUnit = (materialUsageGramsPerUnit / 1000) * materialRatePerKg * 1.15
  const materialCost = materialCostPerUnit * quantity

  const basePrintTimeMinutesPerUnit = (materialUsageGramsPerUnit / 14.5) * 60
  const estimatedMinutesPerUnit = basePrintTimeMinutesPerUnit * (0.2 / layerHeight.value)
  const estimatedMinutes = estimatedMinutesPerUnit * quantity
  const estimatedHours = estimatedMinutes / 60

  const machineRatePerHour = material.machineRate
  const machineCostPerUnit = (estimatedMinutesPerUnit / 60) * machineRatePerHour
  const machineCost = machineCostPerUnit * quantity

  const postProcessingLevel = config.postProcessingLevel
  const postProcessingCostPerUnit = getPostProcessingCostPerUnit(postProcessingLevel, material.difficultyFactor)
  const postProcessingCost = postProcessingCostPerUnit * quantity

  const subtotal = materialCost + machineCost + postProcessingCost

  const overheadAmount = subtotal * 0.15
  const postOverheadTotal = subtotal + overheadAmount

  const profitMargin = postOverheadTotal * 0.4
  const preDiscountTotal = postOverheadTotal + profitMargin

  const quantityDiscountPercent = getQuantityDiscountPercent(quantity)
  const quantityDiscountAmount = preDiscountTotal * (quantityDiscountPercent / 100)
  const totalBeforeRounding = preDiscountTotal - quantityDiscountAmount
  const finalTotal = roundToNearestFive(totalBeforeRounding)

  return {
    scaledVolumeCm3,
    quantity,
    baseWeightGrams,
    infillMultiplier,
    materialUsageGramsPerUnit,
    materialWeightGrams: materialUsageGramsTotal,
    supportWeightGrams: 0,
    materialRatePerKg,
    machineRatePerHour,
    basePrintTimeMinutesPerUnit,
    estimatedMinutesPerUnit,
    estimatedMinutes,
    estimatedHours,
    quantityDiscountPercent,
    quantityDiscountAmount,
    totalBeforeRounding,
    materialCost,
    timeCost: machineCost,
    labourCost: postProcessingCost,
    setupCost: postProcessingCost,
    supportCost: 0,
    postProcessingLevel,
    postProcessingCostPerUnit,
    subtotal,
    overheadAmount,
    profitMargin,
    total: finalTotal,
    dimensionsMm: {
      x: model.dimensionsMm.x,
      y: model.dimensionsMm.y,
      z: model.dimensionsMm.z,
    },
  }
}
