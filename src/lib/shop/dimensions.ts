import type {
  DimensionUnit,
  ProductDimensions,
  ShopSku,
  ShopVariantOption,
  ShopVariantOptionDimension,
  WeightUnit,
} from '@/lib/shop/admin-types'

export const DIMENSION_UNITS: { value: DimensionUnit; label: string }[] = [
  { value: 'mm', label: 'Millimeters (mm)' },
  { value: 'cm', label: 'Centimeters (cm)' },
  { value: 'inch', label: 'Inches (in)' },
]

export const WEIGHT_UNITS: { value: WeightUnit; label: string }[] = [
  { value: 'g', label: 'Grams (g)' },
  { value: 'kg', label: 'Kilograms (kg)' },
  { value: 'oz', label: 'Ounces (oz)' },
  { value: 'lb', label: 'Pounds (lb)' },
]

export const LENGTH_FACTORS: Record<DimensionUnit, number> = { mm: 1, cm: 10, inch: 25.4 }
export const WEIGHT_FACTORS: Record<WeightUnit, number> = { g: 1, kg: 1000, oz: 28.3495, lb: 453.592 }

export function emptyDimensions(unit: DimensionUnit = 'cm', weightUnit: WeightUnit = 'g'): ProductDimensions {
  return {
    length_mm: null,
    width_mm: null,
    height_mm: null,
    weight_g: null,
    volume_cc: null,
    dimension_unit: unit,
    weight_unit: weightUnit,
  }
}

export function hasAnyDimension(dimensions: ProductDimensions | null | undefined) {
  if (!dimensions) return false
  return Boolean(
    dimensions.length_mm !== null ||
      dimensions.width_mm !== null ||
      dimensions.height_mm !== null ||
      dimensions.weight_g !== null
  )
}

export function convertLength(value_mm: number | null, toUnit: DimensionUnit): number | null {
  if (value_mm == null) return null
  return roundNumber(value_mm / LENGTH_FACTORS[toUnit])
}

export function convertWeight(value_g: number | null, toUnit: WeightUnit): number | null {
  if (value_g == null) return null
  return roundNumber(value_g / WEIGHT_FACTORS[toUnit])
}

export function computeVolume(length_mm: number, width_mm: number, height_mm: number): number {
  if (!Number.isFinite(length_mm) || !Number.isFinite(width_mm) || !Number.isFinite(height_mm)) return 0
  if (length_mm < 0 || width_mm < 0 || height_mm < 0) return 0
  return roundNumber((length_mm * width_mm * height_mm) / 1000)
}

export function withComputedVolume(dimensions: ProductDimensions): ProductDimensions {
  const { length_mm, width_mm, height_mm } = dimensions
  if (length_mm == null || width_mm == null || height_mm == null) {
    return { ...dimensions, volume_cc: null }
  }
  return { ...dimensions, volume_cc: computeVolume(length_mm, width_mm, height_mm) }
}

export function roundNumber(value: number, precision = 2): number {
  const factor = 10 ** precision
  return Math.round((value + Number.EPSILON) * factor) / factor
}

function triplet(
  length_mm: number | null,
  width_mm: number | null,
  height_mm: number | null,
  unit: DimensionUnit
): string | null {
  const converted = [length_mm, width_mm, height_mm].map((value) => convertLength(value, unit))
  if (converted.every((value) => value === null)) return null
  return converted.map((value) => (value === null ? '—' : String(value))).join(' × ')
}

export function formatDimensions(dimensions: ProductDimensions | null | undefined): string | null {
  if (!dimensions) return null
  const dimensionText = triplet(
    dimensions.length_mm,
    dimensions.width_mm,
    dimensions.height_mm,
    dimensions.dimension_unit ?? 'cm'
  )
  const weightText =
    dimensions.weight_g !== null && dimensions.weight_g !== undefined
      ? `${convertWeight(dimensions.weight_g, dimensions.weight_unit ?? 'g')} ${dimensions.weight_unit ?? 'g'}`
      : null
  const parts = [dimensionText, weightText].filter(Boolean) as string[]
  return parts.length > 0 ? parts.join(' · ') : null
}

export function formatDimensionUnitLabel(unit: DimensionUnit): string {
  return unit === 'mm' ? 'mm' : unit === 'cm' ? 'cm' : 'in'
}

export function displayDimensions(
  dimensions: ProductDimensions | null | undefined,
  unit: DimensionUnit = 'cm',
  weightUnit: WeightUnit = 'g'
): { dimensionText: string | null; weightText: string | null } {
  if (!dimensions) return { dimensionText: null, weightText: null }
  return {
    dimensionText: triplet(dimensions.length_mm, dimensions.width_mm, dimensions.height_mm, unit),
    weightText:
      dimensions.weight_g !== null && dimensions.weight_g !== undefined
        ? `${convertWeight(dimensions.weight_g, weightUnit)} ${weightUnit}`
        : null,
  }
}

export type DimensionsWithUnits = {
  dimensions: ProductDimensions
  dimension_unit: DimensionUnit
  weight_unit: WeightUnit
}

export function parseDimensionsJson(raw: unknown): ProductDimensions | null {
  if (!raw || typeof raw !== 'object') return null
  const value = raw as Partial<ProductDimensions>
  const dimension_unit: DimensionUnit = ['mm', 'cm', 'inch'].includes(value.dimension_unit as string)
    ? (value.dimension_unit as DimensionUnit)
    : 'cm'
  const weight_unit: WeightUnit = ['g', 'kg', 'oz', 'lb'].includes(value.weight_unit as string)
    ? (value.weight_unit as WeightUnit)
    : 'g'
  const toNullableNumber = (input: unknown): number | null => {
    const numeric = Number(input)
    return Number.isFinite(numeric) && numeric >= 0 ? Number(numeric.toFixed(2)) : null
  }
  return {
    length_mm: toNullableNumber(value.length_mm),
    width_mm: toNullableNumber(value.width_mm),
    height_mm: toNullableNumber(value.height_mm),
    weight_g: toNullableNumber(value.weight_g),
    volume_cc: toNullableNumber(value.volume_cc),
    dimension_unit,
    weight_unit,
  }
}

export function resolveSkuDimensions(
  sku: Pick<ShopSku, 'variant_combination'>,
  options: ShopVariantOption[],
  optionDimensions: ShopVariantOptionDimension[],
  defaultDimensions: ProductDimensions | null
): ProductDimensions | null {
  const combination = sku.variant_combination ?? {}
  for (const option of options) {
    const value = combination[option.option_name]
    if (typeof value !== 'string') continue
    const match = optionDimensions.find(
      (entry) => entry.option_name === option.option_name && entry.option_value === value
    )
    if (match && hasAnyDimension(match.dimensions)) return match.dimensions
  }
  if (defaultDimensions && hasAnyDimension(defaultDimensions)) return defaultDimensions
  return null
}

export function resolveDimensionsForSelection(
  optionDimensions: ShopVariantOptionDimension[],
  defaultDimensions: ProductDimensions | null,
  selected: Record<string, string | boolean | null | undefined>,
  options: ShopVariantOption[]
): ProductDimensions | null {
  for (const option of options) {
    const value = selected[option.option_name]
    if (typeof value !== 'string') continue
    const match = optionDimensions.find(
      (entry) => entry.option_name === option.option_name && entry.option_value === value
    )
    if (match?.dimensions && hasAnyDimension(match.dimensions)) return match.dimensions
  }
  if (defaultDimensions && hasAnyDimension(defaultDimensions)) return defaultDimensions
  return null
}

export function resolveBoxDimensions(
  optionDimensions: ShopVariantOptionDimension[],
  productBoxDimensions: ProductDimensions | null,
  productDefaultDimensions: ProductDimensions | null,
  combination: Record<string, string | boolean | null | undefined>
): ProductDimensions | null {
  for (const [optionName, value] of Object.entries(combination)) {
    if (typeof value !== 'string') continue
    const match = optionDimensions.find(
      (entry) => entry.option_name === optionName && entry.option_value === value
    )
    if (match?.box_dimensions && hasAnyDimension(match.box_dimensions)) return match.box_dimensions
  }
  if (productBoxDimensions && hasAnyDimension(productBoxDimensions)) return productBoxDimensions
  if (productDefaultDimensions && hasAnyDimension(productDefaultDimensions)) return productDefaultDimensions
  return null
}

export type ShopOption = Pick<ShopVariantOption, 'option_name' | 'option_type' | 'display_order' | 'is_required'>