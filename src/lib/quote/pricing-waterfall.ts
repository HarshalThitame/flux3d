import type { BusinessSettings, CartDiscountTier, PostProcessingMultipliers } from '@/lib/admin/business-settings'
import type { ParsedModel, PostProcessingLevel, QuoteConfig, QuoteMaterial } from '@/lib/quote/types'
import { getMaterialById, layerHeightOptions } from '@/lib/quote/materials'

export type DiscountType = 'percentage' | 'fixed_amount' | 'free_shipping' | string

export type PromotionInput = {
  discountType?: DiscountType | null
  discountValue?: number | null
  maxDiscount?: number | null
}

export type PricingSettingsInput = Pick<
  BusinessSettings,
  | 'overheadPercentage'
  | 'marginPercentage'
  | 'materialMarkupPercent'
  | 'printSpeedGramsPerHour'
  | 'postProcessingMultipliers'
  | 'deliveryChargeThreshold'
  | 'defaultDeliveryCharge'
  | 'cartDiscountEnabled'
  | 'cartDiscountTiers'
  | 'minimumOrderValue'
  | 'gstInclusivePricing'
>

export type WaterfallInput = {
  materialCost: number
  machineCost: number
  postProcessingCharges?: number
  quantity: number
  overheadPercent: number
  marginPercent: number
  cartDiscountPercent?: number
  coupon?: PromotionInput | null
  offer?: PromotionInput | null
  deliveryCharge?: number | null
  deliveryThreshold?: number
  defaultDeliveryCharge?: number
  minimumOrderValue?: number
}

export type PricingWaterfall = {
  materialCost: number
  machineCost: number
  postProcessingCharges: number
  subtotal: number
  overheadPercent: number
  overheadPercentage: number
  overheadAmount: number
  marginPercent: number
  marginPercentage: number
  marginAmount: number
  priceBeforeDiscount: number
  /** Database-compatible alias for priceBeforeDiscount / orders.total_price. */
  totalPrice: number
  cartDiscountPercent: number
  cartDiscountAmount: number
  afterCart: number
  couponDiscountAmount: number
  afterCoupon: number
  offerDiscountAmount: number
  discount: number
  finalPrice: number
  minimumOrderValue: number
  priceBeforeMinimum: number
  deliveryCharge: number
  grandTotal: number
  price: number
  pricePerUnit: number
}

export type QuotePricingResult = PricingWaterfall & {
  scaledVolumeCm3: number
  quantity: number
  baseWeightGrams: number
  infillMultiplier: number
  materialUsageGramsPerUnit: number
  materialWeightGrams: number
  supportWeightGrams: number
  materialRatePerKg: number
  machineRatePerHour: number
  basePrintTimeMinutesPerUnit: number
  estimatedMinutesPerUnit: number
  estimatedMinutes: number
  estimatedHours: number
  timeCost: number
  labourCost: number
  setupCost: number
  supportCost: number
  postProcessingLevel: PostProcessingLevel
  postProcessingCostPerUnit: number
  profitMargin: number
  difficultyFactor: number
  dimensionsMm: {
    x: number
    y: number
    z: number
  }
}

export function roundMoney(value: number) {
  if (!Number.isFinite(value)) return 0
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function positiveNumber(value: number | null | undefined, fallback = 0) {
  const next = Number(value)
  return Number.isFinite(next) ? Math.max(0, next) : fallback
}

export function calculateDeliveryChargeFromSettings(
  price: number,
  settings: Pick<BusinessSettings, 'deliveryChargeThreshold' | 'defaultDeliveryCharge'>
) {
  const threshold = positiveNumber(settings.deliveryChargeThreshold, 349)
  const charge = positiveNumber(settings.defaultDeliveryCharge, 50)
  return price >= threshold ? 0 : charge
}

export function getHighestCartDiscountTier(
  totalPrice: number,
  tiers: CartDiscountTier[] = [],
  enabled = true
) {
  if (!enabled || !Array.isArray(tiers) || tiers.length === 0) return null
  const safeTotal = positiveNumber(totalPrice)
  return [...tiers]
    .filter((tier) => safeTotal >= positiveNumber(tier.minCartValue))
    .sort((left, right) => positiveNumber(right.minCartValue) - positiveNumber(left.minCartValue))[0] ?? null
}

export function calculatePromotionDiscount(baseAmount: number, promotion?: PromotionInput | null) {
  if (!promotion) return 0
  const safeBase = positiveNumber(baseAmount)
  const discountValue = positiveNumber(promotion.discountValue)
  const maxDiscount = promotion.maxDiscount == null ? null : positiveNumber(promotion.maxDiscount)

  if (safeBase <= 0 || discountValue <= 0) return 0

  if (promotion.discountType === 'percentage') {
    const calculated = safeBase * (discountValue / 100)
    return roundMoney(maxDiscount == null || maxDiscount <= 0 ? calculated : Math.min(calculated, maxDiscount))
  }

  if (promotion.discountType === 'fixed_amount') {
    return roundMoney(Math.min(discountValue, safeBase))
  }

  return 0
}

export function calculatePostProcessingCharge(
  level: PostProcessingLevel,
  baseAmount: number,
  difficultyFactor: number,
  multipliers: PostProcessingMultipliers
) {
  const multiplier = positiveNumber(multipliers[level], 0)
  if (multiplier <= 0) return 0
  return roundMoney(baseAmount * multiplier * positiveNumber(difficultyFactor, 1))
}

export function calculatePricingWaterfall(input: WaterfallInput): PricingWaterfall {
  const quantity = Math.max(1, Math.floor(positiveNumber(input.quantity, 1)))
  const materialCost = roundMoney(input.materialCost)
  const machineCost = roundMoney(input.machineCost)
  const postProcessingCharges = roundMoney(input.postProcessingCharges ?? 0)
  const subtotal = roundMoney(materialCost + machineCost + postProcessingCharges)
  const overheadPercent = positiveNumber(input.overheadPercent)
  const overheadAmount = roundMoney(subtotal * (overheadPercent / 100))
  const marginPercent = positiveNumber(input.marginPercent)
  const marginAmount = roundMoney(subtotal * (marginPercent / 100))
  const totalPrice = roundMoney(subtotal + overheadAmount + marginAmount)
  const cartDiscountPercent = positiveNumber(input.cartDiscountPercent)
  const cartDiscountAmount = roundMoney(totalPrice * (cartDiscountPercent / 100))
  const afterCart = roundMoney(Math.max(0, totalPrice - cartDiscountAmount))
  const couponDiscountAmount = calculatePromotionDiscount(afterCart, input.coupon)
  const afterCoupon = roundMoney(Math.max(0, afterCart - couponDiscountAmount))
  const offerDiscountAmount = calculatePromotionDiscount(afterCoupon, input.offer)
  const finalPrice = roundMoney(Math.max(0, afterCoupon - offerDiscountAmount))
  const minimumOrderValue = Math.max(0, positiveNumber(input.minimumOrderValue, 0))
  const priceBeforeMinimum = finalPrice
  const priceAfterMinimum = minimumOrderValue > 0 && finalPrice > 0 && finalPrice < minimumOrderValue
    ? roundMoney(minimumOrderValue)
    : finalPrice
  const deliveryCharge = roundMoney(
    input.deliveryCharge == null
      ? calculateDeliveryChargeFromSettings(priceAfterMinimum, {
          deliveryChargeThreshold: input.deliveryThreshold ?? 349,
          defaultDeliveryCharge: input.defaultDeliveryCharge ?? 50,
        })
      : input.deliveryCharge
  )
  const discount = roundMoney(cartDiscountAmount + couponDiscountAmount + offerDiscountAmount)
  const grandTotal = roundMoney(priceAfterMinimum + deliveryCharge)

  return {
    materialCost,
    machineCost,
    postProcessingCharges,
    subtotal,
    overheadPercent,
    overheadPercentage: overheadPercent,
    overheadAmount,
    marginPercent,
    marginPercentage: marginPercent,
    marginAmount,
    priceBeforeDiscount: totalPrice,
    totalPrice,
    cartDiscountPercent,
    cartDiscountAmount,
    afterCart,
    couponDiscountAmount,
    afterCoupon,
    offerDiscountAmount,
    discount,
    finalPrice: priceAfterMinimum,
    minimumOrderValue,
    priceBeforeMinimum,
    deliveryCharge,
    grandTotal,
    price: priceAfterMinimum,
    pricePerUnit: roundMoney(totalPrice / quantity),
  }
}

export function calculateQuotePricing(
  model: ParsedModel | null,
  config: QuoteConfig,
  materials: QuoteMaterial[],
  settings: PricingSettingsInput
): QuotePricingResult | null {
  if (!model) return null
  const material = getMaterialById(config.materialId, materials)
  if (!material) return null

  const layerHeight = layerHeightOptions.find((option) => option.value === config.layerHeight) ?? layerHeightOptions[0]
  if (!layerHeight) return null

  const quantity = Math.max(1, Math.floor(config.quantity || 1))
  const scaledVolumeCm3 = model.volumeMm3 / 1000
  const infillFactor = 0.2 + 0.8 * (config.infill / 100)
  const supportFactor = config.supports ? 1.12 : 1
  const baseWeightGrams = scaledVolumeCm3 * material.density
  const materialWeightGramsPerUnit = baseWeightGrams * infillFactor * material.multiplier * supportFactor
  const supportWeightGramsPerUnit = config.supports ? materialWeightGramsPerUnit * (0.12 / 1.12) : 0
  const materialWeightGramsTotal = materialWeightGramsPerUnit * quantity
  const supportWeightGramsTotal = supportWeightGramsPerUnit * quantity
  const materialRatePerKg = material.pricePerGram * 1000
  const markupMultiplier = 1 + positiveNumber(settings.materialMarkupPercent, 0) / 100
  const materialCostPerUnit = materialWeightGramsPerUnit * material.pricePerGram * markupMultiplier
  const materialCost = materialCostPerUnit * quantity
  const supportCost = config.supports ? supportWeightGramsTotal * material.pricePerGram : 0
  const printSpeedGramsPerHour = Math.max(0.01, positiveNumber(settings.printSpeedGramsPerHour, 40))
  const basePrintTimeMinutesPerUnit = (materialWeightGramsPerUnit / printSpeedGramsPerHour) * 60
  const layerHeightMultiplier = layerHeight.multiplier
  const estimatedMinutesPerUnit = basePrintTimeMinutesPerUnit * layerHeightMultiplier
  const estimatedMinutes = estimatedMinutesPerUnit * quantity
  const estimatedHours = estimatedMinutes / 60
  const machineRatePerHour = material.machineRate
  const machineCostPerUnit = (estimatedMinutesPerUnit / 60) * machineRatePerHour
  const machineCost = machineCostPerUnit * quantity
  const postProcessingLevel = config.postProcessingLevel
  const postProcessingCostPerUnit = calculatePostProcessingCharge(
    postProcessingLevel,
    materialCostPerUnit + machineCostPerUnit,
    material.difficultyFactor,
    settings.postProcessingMultipliers
  )
  const postProcessingCost = postProcessingCostPerUnit * quantity
  const preliminaryWaterfall = calculatePricingWaterfall({
    materialCost,
    machineCost,
    postProcessingCharges: postProcessingCost,
    quantity,
    overheadPercent: settings.overheadPercentage,
    marginPercent: settings.marginPercentage,
    cartDiscountPercent: 0,
    deliveryThreshold: settings.deliveryChargeThreshold,
    defaultDeliveryCharge: settings.defaultDeliveryCharge,
    minimumOrderValue: settings.minimumOrderValue,
  })
  const matchedCartTier = getHighestCartDiscountTier(
    preliminaryWaterfall.priceBeforeDiscount,
    settings.cartDiscountTiers,
    settings.cartDiscountEnabled
  )
  const waterfall = calculatePricingWaterfall({
    materialCost,
    machineCost,
    postProcessingCharges: postProcessingCost,
    quantity,
    overheadPercent: settings.overheadPercentage,
    marginPercent: settings.marginPercentage,
    cartDiscountPercent: matchedCartTier?.discountPercent ?? 0,
    deliveryThreshold: settings.deliveryChargeThreshold,
    defaultDeliveryCharge: settings.defaultDeliveryCharge,
    minimumOrderValue: settings.minimumOrderValue,
  })

  return {
    ...waterfall,
    scaledVolumeCm3,
    quantity,
    baseWeightGrams,
    infillMultiplier: infillFactor,
    materialUsageGramsPerUnit: materialWeightGramsPerUnit,
    materialWeightGrams: materialWeightGramsTotal,
    supportWeightGrams: supportWeightGramsTotal,
    materialRatePerKg,
    machineRatePerHour,
    basePrintTimeMinutesPerUnit,
    estimatedMinutesPerUnit,
    estimatedMinutes,
    estimatedHours,
    timeCost: waterfall.machineCost,
    labourCost: waterfall.postProcessingCharges,
    setupCost: waterfall.postProcessingCharges,
    supportCost,
    postProcessingLevel,
    postProcessingCostPerUnit,
    profitMargin: waterfall.marginAmount,
    difficultyFactor: material.difficultyFactor,
    dimensionsMm: {
      x: model.dimensionsMm.x,
      y: model.dimensionsMm.y,
      z: model.dimensionsMm.z,
    },
  }
}
