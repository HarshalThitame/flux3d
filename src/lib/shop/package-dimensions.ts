import { hasAnyDimension, parseDimensionsJson } from '@/lib/shop/dimensions'

export const SHIPROCKET_PACKAGE_LIMITS = {
  minWeightKg: 0.05,
  maxWeightKg: 30,
  minSizeCm: 1,
  maxSizeCm: 120,
} as const

export const SHIPROCKET_DEFAULT_PACKAGE = {
  weightG: 500,
  lengthCm: 15,
  breadthCm: 10,
  heightCm: 10,
} as const

export type SuggestedPackage = {
  weight_kg: number
  length_cm: number
  breadth_cm: number
  height_cm: number
}

export type PackageOverrides = {
  weight_kg?: number
  length_cm?: number
  breadth_cm?: number
  height_cm?: number
}

type PackageDims = {
  length_mm?: number | null
  width_mm?: number | null
  height_mm?: number | null
  weight_g?: number | null
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {}
}

function toPositiveNumber(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function resolveItemDims(
  item: Record<string, unknown>,
  products: Array<Record<string, unknown>> | null,
  variantDimensionRows: Array<Record<string, unknown>> | null
): PackageDims {
  const productId = String(item.productId ?? item.product_id ?? '')
  const product = products?.find((row) => String(row.id ?? '') === productId)

  let dims: PackageDims = {}
  const combination = asRecord(item.variantCombination ?? item.variant_combination ?? {})
  for (const [optionName, optionValue] of Object.entries(combination)) {
    if (typeof optionValue !== 'string') continue
    const match = variantDimensionRows?.find(
      (row) =>
        String(row.product_id ?? '') === productId &&
        row.option_name === optionName &&
        row.option_value === optionValue &&
        row.dimensions
    )
    const parsed = match ? parseDimensionsJson(match.dimensions) : null
    if (parsed && hasAnyDimension(parsed)) {
      dims = parsed as PackageDims
      break
    }
  }
  if (!Object.keys(dims).length && product?.default_dimensions) {
    const parsed = parseDimensionsJson(product.default_dimensions)
    if (parsed && hasAnyDimension(parsed)) dims = parsed as PackageDims
  }
  return dims
}

export function computeSuggestedPackage(
  items: Array<Record<string, unknown>>,
  products: Array<Record<string, unknown>> | null,
  variantDimensionRows: Array<Record<string, unknown>> | null
): SuggestedPackage {
  let totalWeightG = 0
  let maxLengthCm: number = SHIPROCKET_DEFAULT_PACKAGE.lengthCm
  let maxBreadthCm: number = SHIPROCKET_DEFAULT_PACKAGE.breadthCm
  let maxHeightCm: number = SHIPROCKET_DEFAULT_PACKAGE.heightCm

  for (const rawItem of items) {
    const item = asRecord(rawItem)
    const qty = Math.max(Math.floor(toPositiveNumber(item.quantity ?? item.units)) || 1, 1)
    const dims = resolveItemDims(item, products, variantDimensionRows)

    const weightG = toPositiveNumber(dims.weight_g) || SHIPROCKET_DEFAULT_PACKAGE.weightG
    const lengthCm = toPositiveNumber(dims.length_mm)
      ? toPositiveNumber(dims.length_mm) / 10
      : SHIPROCKET_DEFAULT_PACKAGE.lengthCm
    const breadthCm = toPositiveNumber(dims.width_mm)
      ? toPositiveNumber(dims.width_mm) / 10
      : SHIPROCKET_DEFAULT_PACKAGE.breadthCm
    const heightCm = toPositiveNumber(dims.height_mm)
      ? toPositiveNumber(dims.height_mm) / 10
      : SHIPROCKET_DEFAULT_PACKAGE.heightCm

    totalWeightG += weightG * qty
    maxLengthCm = Math.max(maxLengthCm, lengthCm)
    maxBreadthCm = Math.max(maxBreadthCm, breadthCm)
    maxHeightCm = Math.max(maxHeightCm, heightCm)
  }

  return {
    weight_kg: Math.max(Math.round((totalWeightG / 1000) * 100) / 100, 0.1),
    length_cm: Math.ceil(maxLengthCm),
    breadth_cm: Math.ceil(maxBreadthCm),
    height_cm: Math.ceil(maxHeightCm),
  }
}

export function clampPackageOverrides(input: unknown): PackageOverrides {
  const raw = asRecord(input)
  const clamp = (value: unknown, min: number, max: number): number | undefined => {
    const parsed = Number(value)
    if (!Number.isFinite(parsed) || parsed <= 0) return undefined
    return Math.min(Math.max(parsed, min), max)
  }
  const result: PackageOverrides = {}
  const weight = clamp(raw.weight_kg, SHIPROCKET_PACKAGE_LIMITS.minWeightKg, SHIPROCKET_PACKAGE_LIMITS.maxWeightKg)
  if (weight !== undefined) result.weight_kg = weight
  const length = clamp(raw.length_cm, SHIPROCKET_PACKAGE_LIMITS.minSizeCm, SHIPROCKET_PACKAGE_LIMITS.maxSizeCm)
  if (length !== undefined) result.length_cm = length
  const breadth = clamp(raw.breadth_cm, SHIPROCKET_PACKAGE_LIMITS.minSizeCm, SHIPROCKET_PACKAGE_LIMITS.maxSizeCm)
  if (breadth !== undefined) result.breadth_cm = breadth
  const height = clamp(raw.height_cm, SHIPROCKET_PACKAGE_LIMITS.minSizeCm, SHIPROCKET_PACKAGE_LIMITS.maxSizeCm)
  if (height !== undefined) result.height_cm = height
  return result
}

export function applyPackageOverrides(
  suggested: SuggestedPackage,
  overrides: PackageOverrides
): SuggestedPackage {
  return {
    weight_kg: overrides.weight_kg ?? suggested.weight_kg,
    length_cm: overrides.length_cm ?? suggested.length_cm,
    breadth_cm: overrides.breadth_cm ?? suggested.breadth_cm,
    height_cm: overrides.height_cm ?? suggested.height_cm,
  }
}

export function istDatePlusDays(days: number): string {
  const IST_OFFSET_MINUTES = 330
  return new Date(Date.now() + (IST_OFFSET_MINUTES + days * 1440) * 60 * 1000).toLocaleDateString('en-CA')
}

export const ESTIMATED_DELIVERY_DAYS = 7
