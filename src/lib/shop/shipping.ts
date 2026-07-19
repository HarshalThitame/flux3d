import { createAdminSupabaseClient } from '@/lib/admin/server'
import type { BusinessSettings } from '@/lib/admin/business-settings'

export async function calculateShippingFromRules(params: {
  pincode: string
  state: string
  subtotal: number
  weightGrams?: number
}): Promise<{ chargePaise: number; available: boolean; reason?: string }> {
  const supabase = createAdminSupabaseClient()
  const { data: rules, error } = await supabase
    .from('shipping_rules')
    .select('*')
    .eq('is_active', true)
    .order('minimum_order_value', { ascending: false })

  if (error) {
    console.error('[shipping] Failed to load shipping rules:', error)
  }

  const numericPincode = Number(params.pincode)
  const matched = (rules ?? []).find((rule) => {
    const ruleState = String(rule.state ?? '').trim().toLowerCase()
    const stateMatches = !ruleState || ruleState === params.state.toLowerCase()
    const start = rule.pincode_range_start ? Number(rule.pincode_range_start) : 0
    const end = rule.pincode_range_end ? Number(rule.pincode_range_end) : 999999
    const pincodeMatches = numericPincode >= start && numericPincode <= end
    const minOrder = Number(rule.minimum_order_value ?? 0)
    const weight = Number(rule.maximum_weight_grams ?? Infinity)
    const weightMatches = (params.weightGrams ?? 0) <= weight
    return stateMatches && pincodeMatches && params.subtotal >= minOrder && weightMatches
  })

  if (matched?.restricted) {
    return { chargePaise: 0, available: false, reason: 'Delivery is not available for this address.' }
  }

  if (matched) {
    const chargePaise = Number(matched.charge_paise ?? (Number(matched.charge ?? 0) * 100))
    return { chargePaise, available: true }
  }

  // Fallback to business settings — return paise
  const chargePaise = params.subtotal >= 499 ? 0 : 5000
  return { chargePaise, available: true }
}

export function fallbackShippingCharge(subtotal: number, settings: Pick<BusinessSettings, 'deliveryChargeThreshold' | 'defaultDeliveryCharge'>) {
  const threshold = Number(settings.deliveryChargeThreshold ?? 499)
  const charge = Number(settings.defaultDeliveryCharge ?? 50)
  return subtotal >= threshold ? 0 : Math.round(charge * 100)
}
