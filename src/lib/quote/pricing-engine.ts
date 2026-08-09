import { FALLBACK_SETTINGS } from '@/lib/settings-fallback'
import {
  calculatePostProcessingCharge as calculateConfiguredPostProcessingCharge,
  calculateQuotePricing,
  type PricingSettingsInput,
} from '@/lib/quote/pricing-waterfall'
import type {
  CartDiscountTier,
  ParsedModel,
  PriceBreakdown,
  QuoteConfig,
  QuoteMaterial,
  PostProcessingLevel,
} from '@/lib/quote/types'

export const postProcessingOptions: Array<{
  value: PostProcessingLevel
  label: string
  description: string
}> = [
  { value: 'none', label: 'None', description: 'Raw part, no finishing work.' },
  { value: 'sanded', label: 'Sanded', description: 'Sanding for a smoother finish.' },
  { value: 'sanded-painted', label: 'Sanded + Painted', description: 'Sanding, primer, and paint-ready finishing.' },
]

export function getPostProcessingCharge(
  level: PostProcessingLevel,
  baseAmount: number,
  difficultyFactor: number,
  multipliers = FALLBACK_SETTINGS.postProcessingMultipliers
) {
  return calculateConfiguredPostProcessingCharge(level, baseAmount, difficultyFactor, multipliers)
}

export function formatDurationMinutes(totalMinutes: number) {
  const roundedMinutes = Math.max(0, Math.round(totalMinutes))
  const hours = Math.floor(roundedMinutes / 60)
  const minutes = roundedMinutes % 60

  return `${hours}h ${String(minutes).padStart(2, '0')}m`
}

function legacySettings(
  marginPercentage: number,
  cartDiscountEnabled: boolean,
  cartDiscountTiers: CartDiscountTier[]
): PricingSettingsInput {
  return {
    overheadPercentage: FALLBACK_SETTINGS.overheadPercentage,
    marginPercentage,
    materialMarkupPercent: FALLBACK_SETTINGS.materialMarkupPercent,
    printSpeedGramsPerHour: FALLBACK_SETTINGS.printSpeedGramsPerHour,
    postProcessingMultipliers: FALLBACK_SETTINGS.postProcessingMultipliers,
    deliveryChargeThreshold: FALLBACK_SETTINGS.deliveryChargeThreshold,
    defaultDeliveryCharge: FALLBACK_SETTINGS.defaultDeliveryCharge,
    cartDiscountEnabled,
    cartDiscountTiers,
    minimumOrderValue: FALLBACK_SETTINGS.minimumOrderValue,
    gstInclusivePricing: FALLBACK_SETTINGS.gstInclusivePricing,
  }
}

export function calculateInstantQuote(
  model: ParsedModel | null,
  config: QuoteConfig,
  materials: QuoteMaterial[] = [],
  settingsOrMargin: PricingSettingsInput | number = FALLBACK_SETTINGS,
  cartDiscountEnabled = true,
  cartDiscountTiers: CartDiscountTier[] = []
): PriceBreakdown | null {
  const settings = typeof settingsOrMargin === 'number'
    ? legacySettings(settingsOrMargin, cartDiscountEnabled, cartDiscountTiers)
    : settingsOrMargin

  return calculateQuotePricing(model, config, materials, settings)
}
