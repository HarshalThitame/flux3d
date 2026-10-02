import type { BusinessSettings } from '@/lib/admin/business-settings'
import { createAdminClient } from '@/lib/supabase/admin'
import { getCheckoutSettings } from '@/lib/settings'
import { toPaise } from './financials'

export type ShippingRuleRow = {
  id: string
  state: string | null
  pincode_range_start: string | null
  pincode_range_end: string | null
  minimum_order_value: number | null
  maximum_weight_grams: number | null
  charge: number | null
  restricted: boolean
}

type ShippingInput = {
  pincode: string
  state: string
  /** Merchandise after promotions; used for the free-delivery threshold. */
  subtotal: number
  /** Minimum purchase eligibility keeps its pre-discount meaning. */
  minimumOrderSubtotal?: number
  weightGrams?: number
  settings?: Pick<BusinessSettings, 'deliveryChargeThreshold' | 'defaultDeliveryCharge' | 'shopMinimumOrderValue'>
}

function specificity(rule: ShippingRuleRow) {
  return (rule.pincode_range_start || rule.pincode_range_end ? 2 : 0) + (rule.state ? 1 : 0)
}

export function resolveShippingRules(params: ShippingInput, rules: ShippingRuleRow[]): { chargePaise: number; available: boolean; reason?: string; ruleId?: string } {
  const settings = params.settings
  if (!settings) throw new Error('Delivery settings are unavailable.')
  const defaultChargePaise = fallbackShippingCharge(params.subtotal, settings)
  // Until destination is known, only show an estimate from the global settings.
  if (!params.pincode || !params.state) return { chargePaise: defaultChargePaise, available: true }
  const pincode = params.pincode.trim()
  const state = params.state.trim().toLowerCase()
  const candidates = rules.filter(rule => (!rule.state || rule.state.trim().toLowerCase() === state) &&
    (!rule.pincode_range_start || pincode >= rule.pincode_range_start) && (!rule.pincode_range_end || pincode <= rule.pincode_range_end))
    .sort((a, b) => specificity(b) - specificity(a) ||
      ((Number(a.pincode_range_end || 999999) - Number(a.pincode_range_start || 0)) - (Number(b.pincode_range_end || 999999) - Number(b.pincode_range_start || 0))) || a.id.localeCompare(b.id))
  if (candidates.some(rule => rule.restricted)) return { chargePaise: 0, available: false, reason: 'Sorry, we do not deliver to this pincode yet.' }
  const best = candidates[0]
  const regionalMinimum = Number(best?.minimum_order_value ?? 0)
  const minimum = regionalMinimum > 0 ? regionalMinimum : Number(settings.shopMinimumOrderValue ?? 0)
  if ((params.minimumOrderSubtotal ?? params.subtotal) < minimum) return { chargePaise: 0, available: false, reason: `This pincode requires a minimum order value of ₹${minimum}.` }
  if (Number(best?.maximum_weight_grams ?? 0) > 0 && Number(params.weightGrams ?? 0) > Number(best?.maximum_weight_grams)) return { chargePaise: 0, available: false, reason: 'Sorry, this order exceeds our delivery weight limit.' }
  return { chargePaise: best && specificity(best) > 0 && best.charge != null ? toPaise(Number(best.charge)) : defaultChargePaise, available: true, ruleId: best?.id }
}

export async function calculateShippingFromRules(params: ShippingInput) {
  const settings = params.settings ?? await getCheckoutSettings()
  const { data, error } = await createAdminClient().from('shipping_rules')
    .select('id,state,pincode_range_start,pincode_range_end,minimum_order_value,maximum_weight_grams,charge,restricted').eq('is_active', true).order('id')
  if (error) throw new Error('Unable to verify delivery charges. Please retry.')
  return resolveShippingRules({ ...params, settings }, (data ?? []) as ShippingRuleRow[])
}

export function fallbackShippingCharge(subtotal: number, settings: Pick<BusinessSettings, 'deliveryChargeThreshold' | 'defaultDeliveryCharge'>) {
  return toPaise(subtotal) >= toPaise(Number(settings.deliveryChargeThreshold)) ? 0 : toPaise(Number(settings.defaultDeliveryCharge))
}
