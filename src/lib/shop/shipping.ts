import type { BusinessSettings } from '@/lib/admin/business-settings'
import { createAdminClient } from '@/lib/supabase/admin'

type ShippingRuleRow = {
  state: string | null
  pincode_range_start: string | null
  pincode_range_end: string | null
  minimum_order_value: number | null
  maximum_weight_grams: number | null
  charge: number | null
  restricted: boolean
}

function isGenericRule(rule: ShippingRuleRow): boolean {
  return !rule.state && !rule.pincode_range_start && !rule.pincode_range_end
}

function pincodeMatches(rule: ShippingRuleRow, pincode: string): boolean {
  const start = rule.pincode_range_start ? String(rule.pincode_range_start) : null
  const end = rule.pincode_range_end ? String(rule.pincode_range_end) : null
  if (!start && !end) return true
  return (!start || pincode >= start) && (!end || pincode <= end)
}

export async function calculateShippingFromRules(params: {
  pincode: string
  state: string
  subtotal: number
  weightGrams?: number
  settings?: Pick<BusinessSettings, 'deliveryChargeThreshold' | 'defaultDeliveryCharge' | 'shopMinimumOrderValue'>
}): Promise<{ chargePaise: number; available: boolean; reason?: string }> {
  const threshold = Number(params.settings?.deliveryChargeThreshold ?? 499)
  const charge = Number(params.settings?.defaultDeliveryCharge ?? 50)
  const globalMinOrderValue = Math.max(0, Number(params.settings?.shopMinimumOrderValue ?? 0))
  const defaultChargePaise = params.subtotal >= threshold ? 0 : Math.round(charge * 100)

  function belowGlobalMinimum(): { chargePaise: number; available: false; reason: string } {
    return {
      chargePaise: 0,
      available: false,
      reason: `This pincode requires a minimum order value of ₹${globalMinOrderValue.toFixed(0)}.`,
    }
  }

  try {
    const pincode = String(params.pincode ?? '').trim()
    const state = String(params.state ?? '').trim().toLowerCase()
    const { data: rules, error } = await createAdminClient()
      .from('shipping_rules')
      .select('state, pincode_range_start, pincode_range_end, minimum_order_value, maximum_weight_grams, charge, restricted')
      .eq('is_active', true)
      .limit(100)

    if (error) {
      console.error('[shipping] Failed to load shipping rules:', error)
      return { chargePaise: defaultChargePaise, available: true }
    }

    if (!rules || rules.length === 0) {
      if (globalMinOrderValue > 0 && params.subtotal < globalMinOrderValue) return belowGlobalMinimum()
      return { chargePaise: defaultChargePaise, available: true }
    }

    const candidates = (rules as ShippingRuleRow[]).filter((rule) => {
      const ruleState = String(rule.state ?? '').trim().toLowerCase()
      return (!ruleState || ruleState === state) && pincodeMatches(rule, pincode)
    })

    if (candidates.some((rule) => rule.restricted)) {
      return { chargePaise: 0, available: false, reason: 'Sorry, we do not deliver to this pincode yet.' }
    }

    // Prefer the most specific matching rule (state/pincode-specific over catch-all)
    const specific = candidates.find((rule) => !isGenericRule(rule))
    const best = specific ?? candidates[0]

    if (best) {
      const maxWeightGrams = Number(best.maximum_weight_grams ?? 0)
      const weightGrams = Number(params.weightGrams ?? 0)
      if (maxWeightGrams > 0 && weightGrams > maxWeightGrams) {
        return { chargePaise: 0, available: false, reason: 'Sorry, this order exceeds our delivery weight limit.' }
      }
      const minOrderValue = Number(best.minimum_order_value ?? 0)
      const effectiveMinOrderValue = minOrderValue > 0 ? minOrderValue : globalMinOrderValue
      if (effectiveMinOrderValue > 0 && params.subtotal < effectiveMinOrderValue) {
        return { chargePaise: 0, available: false, reason: `This pincode requires a minimum order value of ₹${effectiveMinOrderValue.toFixed(0)}.` }
      }
      if (!isGenericRule(best) && best.charge != null) {
        return { chargePaise: Math.round(Number(best.charge) * 100), available: true }
      }
    }

    if (globalMinOrderValue > 0 && params.subtotal < globalMinOrderValue) return belowGlobalMinimum()
    return { chargePaise: defaultChargePaise, available: true }
  } catch (error) {
    console.error('[shipping] Shipping rule check failed, falling back to defaults:', error)
    return { chargePaise: defaultChargePaise, available: true }
  }
}

export function fallbackShippingCharge(subtotal: number, settings: Pick<BusinessSettings, 'deliveryChargeThreshold' | 'defaultDeliveryCharge'>) {
  const threshold = Number(settings.deliveryChargeThreshold ?? 499)
  const charge = Number(settings.defaultDeliveryCharge ?? 50)
  return subtotal >= threshold ? 0 : Math.round(charge * 100)
}
