import { createAdminSupabaseClient } from '@/lib/admin/server'
import { nanoid } from 'nanoid'
import type { QuoteCapture } from './types'

function generateReference(): string {
  const short = nanoid(8).toUpperCase()
  return `QCAP-${short}`
}

export async function createQuoteCapture(params: {
  userId: string
  amountPaise: number
  draftData: Record<string, unknown>
  addressData: Record<string, unknown>
  configData: Record<string, unknown>
  pricingData: Record<string, unknown>
  modelMetadata: Record<string, unknown>
}): Promise<QuoteCapture> {
  const supabase = createAdminSupabaseClient()
  const reference = generateReference()

  const { data, error } = await supabase
    .from('quote_captures')
    .insert({
      user_id: params.userId,
      reference,
      status: 'pending',
      amount_paise: params.amountPaise,
      currency: 'INR',
      draft_data: params.draftData,
      address_data: params.addressData,
      config_data: params.configData,
      pricing_data: params.pricingData,
      model_metadata: params.modelMetadata,
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  return mapQuoteCapture(data)
}

export async function getQuoteCapture(reference: string): Promise<QuoteCapture | null> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('quote_captures')
    .select()
    .eq('reference', reference)
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) return null

  return mapQuoteCapture(data)
}

export async function markQuoteCapturePaid(params: {
  reference: string
  razorpayOrderId: string
  paymentAttemptId: string
  orderId: string
}): Promise<void> {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase
    .from('quote_captures')
    .update({
      status: 'paid',
      razorpay_order_id: params.razorpayOrderId,
      payment_attempt_id: params.paymentAttemptId,
      order_id: params.orderId,
      paid_at: new Date().toISOString(),
    })
    .eq('reference', params.reference)
    .eq('status', 'pending')

  if (error) throw new Error(error.message)
}

export async function cancelQuoteCapture(reference: string): Promise<void> {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase
    .from('quote_captures')
    .update({ status: 'cancelled' })
    .eq('reference', reference)
    .eq('status', 'pending')

  if (error) throw new Error(error.message)
}

export async function expireStaleCaptures(): Promise<number> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('quote_captures')
    .update({ status: 'expired' })
    .eq('status', 'pending')
    .lt('expires_at', new Date().toISOString())
    .select('id')

  if (error) throw new Error(error.message)
  return data?.length ?? 0
}

function mapQuoteCapture(data: Record<string, unknown>): QuoteCapture {
  return {
    id: data.id as string,
    userId: data.user_id as string,
    reference: data.reference as string,
    status: data.status as QuoteCapture['status'],
    amountPaise: Number(data.amount_paise),
    currency: data.currency as string,
    draftData: data.draft_data as Record<string, unknown>,
    addressData: data.address_data as Record<string, unknown>,
    configData: data.config_data as Record<string, unknown>,
    pricingData: data.pricing_data as Record<string, unknown>,
    modelMetadata: data.model_metadata as Record<string, unknown>,
    razorpayOrderId: data.razorpay_order_id as string | null,
    paymentAttemptId: data.payment_attempt_id as string | null,
    orderId: data.order_id as string | null,
    createdAt: data.created_at as string,
    expiresAt: data.expires_at as string,
    paidAt: data.paid_at as string | null,
  }
}
