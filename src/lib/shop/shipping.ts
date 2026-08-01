import type { BusinessSettings } from '@/lib/admin/business-settings'

export async function calculateShippingFromRules(params: {
  pincode: string
  state: string
  subtotal: number
  weightGrams?: number
  settings?: Pick<BusinessSettings, 'deliveryChargeThreshold' | 'defaultDeliveryCharge'>
}): Promise<{ chargePaise: number; available: boolean; reason?: string }> {
  const threshold = Number(params.settings?.deliveryChargeThreshold ?? 499)
  const charge = Number(params.settings?.defaultDeliveryCharge ?? 50)
  const chargePaise = params.subtotal >= threshold ? 0 : Math.round(charge * 100)
  return { chargePaise, available: true }
}

export function fallbackShippingCharge(subtotal: number, settings: Pick<BusinessSettings, 'deliveryChargeThreshold' | 'defaultDeliveryCharge'>) {
  const threshold = Number(settings.deliveryChargeThreshold ?? 499)
  const charge = Number(settings.defaultDeliveryCharge ?? 50)
  return subtotal >= threshold ? 0 : Math.round(charge * 100)
}