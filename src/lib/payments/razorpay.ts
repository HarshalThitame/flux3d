import crypto from 'crypto'
import Razorpay from 'razorpay'
import { nanoid } from 'nanoid'
import { getSupabaseUrl } from '@/lib/supabase/config'
import type {
  RazorpayCheckoutSession,
  RazorpayOrderResponse,
  RazorpayPaymentResponse,
  RazorpayRefundResponse,
} from './types'

export type RazorpayEnvironment = 'test' | 'live'

export type RazorpayConfig = {
  keyId: string
  keySecret: string
  webhookSecret: string
  environment: RazorpayEnvironment
  paymentsEnabled: boolean
}

export function getRazorpayConfig(): RazorpayConfig | null {
  const keyId = process.env.RAZORPAY_KEY_ID?.trim() || ''
  const keySecret = process.env.RAZORPAY_KEY_SECRET?.trim() || ''
  const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET?.trim() || ''
  const environment = (process.env.RAZORPAY_ENVIRONMENT?.trim().toLowerCase() || 'test') as RazorpayEnvironment
  const paymentsEnabled = (process.env.RAZORPAY_PAYMENTS_ENABLED ?? process.env.PAYMENTS_ENABLED ?? 'true').trim().toLowerCase() !== 'false'

  if (!keyId || !keySecret || !webhookSecret) {
    return null
  }

  return {
    keyId,
    keySecret,
    webhookSecret,
    environment: environment === 'live' ? 'live' : 'test',
    paymentsEnabled,
  }
}

export function isRazorpayEnabled() {
  const config = getRazorpayConfig()
  return Boolean(config?.paymentsEnabled)
}

function createRazorpayClient() {
  const config = getRazorpayConfig()
  if (!config) {
    throw new Error('Razorpay credentials are not configured.')
  }

  return new Razorpay({
    key_id: config.keyId,
    key_secret: config.keySecret,
  })
}

export function getPublicRazorpayKeyId() {
  const config = getRazorpayConfig()
  if (!config) {
    throw new Error('Razorpay credentials are not configured.')
  }

  return config.keyId
}

export function createRazorpayOrder(params: {
  amountPaise: number
  currency: string
  receipt: string
  notes: Record<string, string>
}) {
  return createRazorpayClient().orders.create({
    amount: params.amountPaise,
    currency: params.currency,
    receipt: params.receipt.slice(0, 40),
    notes: params.notes,
  }) as Promise<RazorpayOrderResponse>
}

export function fetchRazorpayOrder(orderId: string) {
  return createRazorpayClient().orders.fetch(orderId) as Promise<RazorpayOrderResponse>
}

export function fetchRazorpayPayment(paymentId: string) {
  return createRazorpayClient().payments.fetch(paymentId) as Promise<RazorpayPaymentResponse>
}

export function captureRazorpayPayment(paymentId: string, amountPaise: number, currency: string) {
  return createRazorpayClient().payments.capture(paymentId, amountPaise, currency) as Promise<RazorpayPaymentResponse>
}

export function createRazorpayRefund(params: {
  paymentId: string
  amountPaise: number
  reason: string
  speed?: 'normal' | 'optimum'
  notes?: Record<string, string>
}) {
  return createRazorpayClient().payments.refund(params.paymentId, {
    amount: params.amountPaise,
    notes: params.notes,
    speed: params.speed,
  }) as Promise<RazorpayRefundResponse>
}

export async function listRazorpayPayments(limit = 100) {
  const response = await createRazorpayClient().payments.all({ count: limit }) as unknown as { items?: Array<Record<string, unknown>> }
  return Array.isArray(response?.items) ? response.items : []
}

export function verifyRazorpayCheckoutSignature(params: {
  orderId: string
  paymentId: string
  signature: string
}) {
  const config = getRazorpayConfig()
  if (!config) {
    throw new Error('Razorpay credentials are not configured.')
  }

  const expected = crypto
    .createHmac('sha256', config.keySecret)
    .update(`${params.orderId}|${params.paymentId}`)
    .digest('hex')

  const a = Buffer.from(expected)
  const b = Buffer.from(params.signature)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function verifyRazorpayWebhookSignature(rawBody: string, signature: string) {
  const config = getRazorpayConfig()
  if (!config) {
    throw new Error('Razorpay credentials are not configured.')
  }

  const expected = crypto.createHmac('sha256', config.webhookSecret).update(rawBody).digest('hex')
  const a = Buffer.from(expected)
  const b = Buffer.from(signature)
  if (a.length !== b.length) return false
  return crypto.timingSafeEqual(a, b)
}

export function makeReceipt(prefix: string, attemptNumber: number) {
  const token = nanoid(10)
  return `${prefix}-${attemptNumber}-${token}`.slice(0, 40)
}

export function makeCheckoutSession(params: Omit<RazorpayCheckoutSession, 'keyId'>): RazorpayCheckoutSession {
  return {
    ...params,
    keyId: getPublicRazorpayKeyId(),
  }
}

export function getRazorpayDashboardUrl(entity: 'payments' | 'orders' | 'refunds', id: string) {
  const config = getRazorpayConfig()
  const base = config?.environment === 'live'
    ? 'https://dashboard.razorpay.com'
    : 'https://dashboard.razorpay.com'
  return `${base}/${entity}/${encodeURIComponent(id)}`
}

export function getPublicSupabaseUrl() {
  return getSupabaseUrl()
}
