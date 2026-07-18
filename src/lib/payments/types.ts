export type PaymentProvider = 'razorpay' | 'payu'

export type InternalOrderType = 'shop_order' | 'custom_quote'

export type PaymentPurpose =
  | 'shop_order'
  | 'custom_quote_full_payment'
  | 'custom_quote_deposit'
  | 'custom_quote_balance'

export type PaymentStatus =
  | 'created'
  | 'pending'
  | 'authorized'
  | 'captured'
  | 'paid'
  | 'failed'
  | 'cancelled'
  | 'partially_refunded'
  | 'refunded'
  | 'disputed'

export type PaymentEventProcessingStatus = 'received' | 'processing' | 'processed' | 'ignored' | 'failed'

export type PaymentRefundStatus = 'created' | 'pending' | 'processed' | 'failed' | 'cancelled'

export type PaymentAttemptRecord = {
  id: string
  internal_order_type: InternalOrderType
  internal_order_id: string
  customer_id: string
  provider: PaymentProvider
  payment_purpose: PaymentPurpose
  provider_order_id: string | null
  provider_payment_id: string | null
  amount_paise: number
  currency: string
  status: PaymentStatus
  attempt_number: number
  idempotency_key: string
  receipt: string | null
  failure_code: string | null
  failure_description: string | null
  payment_method: string | null
  captured_at: string | null
  failed_at: string | null
  metadata: Record<string, unknown>
  created_at: string
  updated_at: string
}

export type PaymentEventRecord = {
  id: string
  provider: PaymentProvider
  provider_event_id: string
  event_type: string
  provider_order_id: string | null
  provider_payment_id: string | null
  signature_verified: boolean
  processing_status: PaymentEventProcessingStatus
  retry_count: number
  sanitized_payload: Record<string, unknown>
  processing_error: string | null
  received_at: string
  processed_at: string | null
}

export type PaymentRefundRecord = {
  id: string
  payment_attempt_id: string
  provider_refund_id: string | null
  amount_paise: number
  status: PaymentRefundStatus
  reason: string
  speed: 'normal' | 'optimum' | null
  initiated_by_admin_id: string | null
  provider_response: Record<string, unknown>
  created_at: string
  processed_at: string | null
  failed_at: string | null
}

export type PaymentAuditAction =
  | 'payment_attempt_created'
  | 'payment_attempt_verified'
  | 'payment_attempt_failed'
  | 'payment_webhook_processed'
  | 'refund_initiated'
  | 'refund_processed'
  | 'refund_failed'
  | 'reconciliation_run'

export type RazorpayCheckoutSession = {
  keyId: string
  orderId: string
  amount: number
  currency: string
  name: string
  description: string
  reference: string
  customer: {
    name: string
    email: string
    contact: string
  }
  notes: Record<string, string>
  theme: {
    color: string
  }
}

export type RazorpayOrderResponse = {
  id: string
  amount: number
  amount_due?: number
  amount_paid?: number
  currency: string
  receipt?: string | null
  status?: string
  attempts?: number
  notes?: Record<string, unknown>
  created_at?: number
}

export type RazorpayPaymentResponse = {
  id: string
  amount: number
  currency: string
  status: string
  order_id: string
  method?: string
  email?: string | null
  contact?: string | null
  captured?: boolean
  fee?: number
  tax?: number
  error_code?: string | null
  error_description?: string | null
  error_reason?: string | null
  error_source?: string | null
  error_step?: string | null
  created_at?: number
}

export type RazorpayRefundResponse = {
  id: string
  amount: number
  status: string
  speed?: 'normal' | 'optimum' | null
  reason?: string | null
  payment_id?: string | null
  notes?: Record<string, unknown>
  created_at?: number
}
