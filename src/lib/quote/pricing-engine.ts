import { getMaterialById, layerHeightOptions } from '@/lib/quote/materials'
import type { ParsedModel, PriceBreakdown, QuoteConfig, QuoteMaterial } from '@/lib/quote/types'

function round(value: number, digits = 2) {
  return Number(value.toFixed(digits))
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
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
  const layerHeight = layerHeightOptions.find((option) => option.value === config.layerHeight) ?? layerHeightOptions[1]
  const scaleFactor = config.scalePercent / 100
  const scaledVolumeMm3 = model.volumeMm3 * Math.pow(scaleFactor, 3)
  const scaledVolumeCm3 = scaledVolumeMm3 / 1000

  // Infill and support calculations
  const shellFactor = 0.2
  const infillFactor = shellFactor + (config.infill / 100) * 0.8
  const supportFactor = config.supports ? 1.12 : 1
  const materialWeightGrams =
    scaledVolumeCm3 * material.density * infillFactor * material.multiplier * supportFactor

  // Support weight estimation (12% extra for supports)
  const supportWeightGrams = config.supports ? materialWeightGrams * 0.12 : 0

  // Part weight (without support)
  const partWeightGrams = materialWeightGrams - supportWeightGrams

  // Time calculations
  const scaledHeightMm = model.dimensionsMm.z * scaleFactor
  const baseThroughputGramsPerHour = 14.5 / material.multiplier
  const layerHeightTimeFactor = clamp(0.2 / layerHeight.value, 0.72, 1.35)
  const infillTimeFactor = 0.82 + (config.infill / 100) * 0.45
  const complexityFactor = clamp(0.92 + model.triangleCount / 1_500_000, 0.9, 1.15)
  const heightFactor = 1 + Math.max(scaledHeightMm - 60, 0) / 240
  const estimatedHours = Math.max(
    0.5,
    (materialWeightGrams / baseThroughputGramsPerHour) *
      layerHeightTimeFactor *
      infillTimeFactor *
      complexityFactor *
      heightFactor
  )

  // --- Cost Calculation (INR) ---
  // Material cost: price_per_gram × (part_weight + support_weight)
  const materialCost = material.pricePerGram * (partWeightGrams + supportWeightGrams)

  // Machine cost: print_time_hrs × machine_rate_per_hr
  const machineCost = estimatedHours * material.machineRate

  // Labour cost: (labour_time_hrs × labour_rate) + post_processing_flat
  // Assuming labour time is 20% of print time, labour rate ₹150/hr, post-processing ₹100 flat
  const labourTimeHours = estimatedHours * 0.2
  const labourRatePerHour = 150
  const postProcessingFlat = 100
  const labourCost = labourTimeHours * labourRatePerHour + postProcessingFlat

  // Subtotal before overhead
  const baseSubtotal = materialCost + machineCost + labourCost

  // Overhead: 15% of base subtotal
  const overheadPct = 15
  const subtotalWithOverhead = baseSubtotal * (1 + overheadPct / 100)

  // Wastage buffer: 5%
  const wastagePct = 5
  const afterWastage = subtotalWithOverhead * (1 + wastagePct / 100)

  // Profit margin: 22%
  const marginPct = 22
  const afterMargin = afterWastage * (1 + marginPct / 100)

  // GST: 18% (fixed)
  const gstPct = 18
  const finalTotal = afterMargin * (1 + gstPct / 100)

  return {
    scaledVolumeCm3: round(scaledVolumeCm3),
    materialWeightGrams: round(partWeightGrams),
    supportWeightGrams: round(supportWeightGrams),
    materialCost: round(materialCost),
    estimatedHours: round(estimatedHours),
    timeCost: round(machineCost),
    labourCost: round(labourCost),
    setupCost: round(postProcessingFlat),
    supportCost: round(supportWeightGrams * material.pricePerGram),
    subtotal: round(baseSubtotal),
    overheadAmount: round(subtotalWithOverhead - baseSubtotal),
    wastageAmount: round(afterWastage - subtotalWithOverhead),
    profitMargin: round(afterMargin - afterWastage),
    gstAmount: round(finalTotal - afterMargin),
    total: round(finalTotal),
    dimensionsMm: {
      x: round(model.dimensionsMm.x * scaleFactor, 1),
      y: round(model.dimensionsMm.y * scaleFactor, 1),
      z: round(model.dimensionsMm.z * scaleFactor, 1),
    },
  }
}
