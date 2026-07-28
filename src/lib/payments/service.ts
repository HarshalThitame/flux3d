import { getSettings } from '@/lib/settings'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { buildPublicBusinessProfile } from '@/lib/public-business'
import { notifyPaymentCaptured, notifyPaymentFailed, notifyRefundProcessed } from './email-triggers'
import {
  fetchInternalOrder,
  fetchPaymentAttemptById,
  fetchPaymentAttemptByProviderOrderId,
  fetchPaymentAttemptByProviderPaymentId,
  fetchPaymentEvent,
  fetchActivePaymentAttempt,
  insertPaymentAuditLog,
  insertPaymentEvent,
  insertPaymentRefund,
  listPaymentRefunds,
  listPaymentEvents,
  listPaymentAuditLogs,
  listPaymentAttemptsByProvider,
  listReconciliationRuns,
  insertReconciliationRun,
  lookupPaymentAttemptByInternalOrder,
  snapshotAmount,
  updatePaymentEvent,
  updatePaymentRefund,
  upsertPaymentAttempt,
  type InternalOrderLookup,
  type PaymentOrderSnapshot,
} from './repository'
import { isQuoteApproved } from '@/lib/quote/approval'
import {
  updateOrderPaymentStatus,
  updatePaymentAttemptStatus,
  type PaymentStatusUpdateReason,
} from '@/lib/payments/state'
import {
  createRazorpayOrder,
  createRazorpayRefund,
  getRazorpayConfig,
  listRazorpayPayments,
  makeCheckoutSession,
  makeReceipt,
  verifyRazorpayCheckoutSignature,
  verifyRazorpayWebhookSignature,
  fetchRazorpayOrder,
  fetchRazorpayPayment,
} from './razorpay'
import type {
  InternalOrderType,
  PaymentAttemptRecord,
  PaymentPurpose,
  PaymentStatus,
  RazorpayCheckoutSession,
  RazorpayRefundResponse,
} from './types'
import {
  calculateRefundableBalance,
  summarizeReconciliation,
  summarizeWebhookHealth,
} from './logic'

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value))
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeMoney(value: unknown) {
  const next = Number(value)
  return Number.isFinite(next) ? next : 0
}

function getPaymentPurposeForOrder(type: InternalOrderType) {
  return type === 'shop_order' ? 'shop_order' : 'custom_quote_full_payment'
}

function systemReason(actorId: string, reason = 'Gateway event'): PaymentStatusUpdateReason {
  return { actorId, actorRole: 'system', reason }
}

function customerReason(actorId: string, reason: string): PaymentStatusUpdateReason {
  return { actorId, actorRole: 'customer', reason }
}

function financeReason(actorId: string, reason: string): PaymentStatusUpdateReason {
  return { actorId, actorRole: 'finance', reason, approvedByAdminId: actorId }
}

async function assertQuoteApprovedForPayment(order: Record<string, unknown>, type: InternalOrderType) {
  if (type !== 'custom_quote') return
  if (await isQuoteApproved(String(order.id))) return
  throw new Error('Quote is pending review. Please wait for admin approval before payment.')
}

function getContactFields(order: Record<string, unknown>, type: InternalOrderType) {
  if (type === 'shop_order') {
    const address = asRecord(order.shipping_address)
    return {
      name: normalizeText(address.name) || normalizeText(order.full_name) || 'Flux3D customer',
      email: normalizeText(order.customer_email) || normalizeText(order.email) || '',
      contact: normalizeText(address.phone) || normalizeText(order.phone) || '',
      shippingAddress: address,
    }
  }

  return {
    name: normalizeText(order.full_name) || normalizeText(order.name) || 'Flux3D customer',
    email: normalizeText(order.email) || '',
    contact: normalizeText(order.phone) || '',
    shippingAddress: {
      name: normalizeText(order.full_name) || '',
      phone: normalizeText(order.phone) || '',
      line1: normalizeText(order.address_line1) || '',
      line2: normalizeText(order.address_line2) || '',
      city: normalizeText(order.city) || '',
      state: normalizeText(order.state) || '',
      pincode: normalizeText(order.pincode) || '',
    },
  }
}

function buildPricingSnapshot(order: Record<string, unknown>, type: InternalOrderType) {
  if (type === 'shop_order') {
    return {
      subtotal: normalizeMoney(order.subtotal),
      discount_amount: normalizeMoney(order.discount_amount),
      shipping_charge: normalizeMoney(order.shipping_charge),
      total_amount: normalizeMoney(order.total_amount),
      items: Array.isArray(order.items) ? order.items : [],
      shipping_address: asRecord(order.shipping_address),
    }
  }

  return {
    material: normalizeText(order.material),
    color: normalizeText(order.color),
    quantity: Number(order.quantity ?? 1),
    subtotal: normalizeMoney(order.subtotal),
    delivery_charge: normalizeMoney(order.delivery_charge),
    total_price: normalizeMoney(order.total_price),
    final_price: normalizeMoney(order.final_price ?? order.total_price),
    grand_total: normalizeMoney(order.grand_total ?? order.total_price),
    price_breakdown: asRecord(order.price_breakdown),
    file_url: normalizeText(order.file_url),
  }
}

function buildOrderSnapshot(order: Record<string, unknown>, type: InternalOrderType): PaymentOrderSnapshot {
  const contact = getContactFields(order, type)
  const amountPaise = snapshotAmount(type === 'shop_order' ? normalizeMoney(order.total_amount) : normalizeMoney(order.grand_total ?? order.total_price))
  const orderNumber = normalizeText(order.order_number) || normalizeText(order.id)
  const currency = normalizeText(order.payment_currency) || 'INR'

  return {
    orderNumber,
    amountPaise,
    currency,
    customerName: contact.name,
    customerEmail: contact.email,
    customerPhone: contact.contact,
    billingName: contact.name,
    billingEmail: contact.email,
    billingPhone: contact.contact,
    lineItems: type === 'shop_order' ? (Array.isArray(order.items) ? order.items as Array<Record<string, unknown>> : []) : [buildPricingSnapshot(order, type)],
    shippingAddress: contact.shippingAddress,
    metadata: {
      orderType: type,
      orderId: normalizeText(order.id),
      orderNumber,
      purpose: getPaymentPurposeForOrder(type),
    },
    currentPaymentStatus: normalizeText(order.payment_status) as PaymentStatus | null,
    currentProviderOrderId: normalizeText(order.provider_order_id) || null,
    currentProviderPaymentId: normalizeText(order.provider_payment_id) || null,
    pricingSnapshot: buildPricingSnapshot(order, type),
  }
}

function createIdempotencyKey(params: {
  type: InternalOrderType
  orderId: string
  paymentPurpose: PaymentPurpose
  attemptNumber: number
  amountPaise: number
}) {
  return [
    params.type,
    params.orderId,
    params.paymentPurpose,
    params.attemptNumber,
    params.amountPaise,
  ].join(':')
}

export type CreateCheckoutResult = {
  session: RazorpayCheckoutSession
  paymentAttempt: PaymentAttemptRecord
  orderSnapshot: PaymentOrderSnapshot
}

export async function createCheckoutSession(params: InternalOrderLookup & {
  paymentPurpose?: PaymentPurpose
  expectedAmountPaise?: number
}) : Promise<CreateCheckoutResult> {
  const order = await fetchInternalOrder(params)
  if (!order) {
    throw new Error('Order not found.')
  }

  if (params.type === 'shop_order') {
    const status = normalizeText(order.payment_status)
    if (status === 'paid' || status === 'captured') {
      throw new Error('This order is already paid.')
    }
  } else {
    const status = normalizeText(order.payment_status)
    if (status === 'paid' || status === 'captured') {
      throw new Error('This quote has already been paid.')
    }
    await assertQuoteApprovedForPayment(order, params.type)
  }

  const orderSnapshot = buildOrderSnapshot(order, params.type)
  const amountPaise = params.expectedAmountPaise ?? orderSnapshot.amountPaise
  if (amountPaise !== orderSnapshot.amountPaise) {
    throw new Error('Order amount changed. Please refresh and try again.')
  }

  const settings = await getSettings()
  if (settings.paymentsEnabled === false || settings.razorpayEnabled === false) {
    throw new Error('Payments are temporarily disabled.')
  }

  const paymentPurpose = params.paymentPurpose ?? getPaymentPurposeForOrder(params.type)
  const existing = await fetchActivePaymentAttempt({
    internalOrderType: params.type,
    internalOrderId: params.id,
    paymentPurpose,
    provider: 'razorpay',
  })

  if (existing && existing.amount_paise === amountPaise && existing.provider_order_id) {
    return {
      session: makeCheckoutSession({
        orderId: existing.provider_order_id,
        amount: existing.amount_paise,
        currency: existing.currency,
        name: settings.razorpayCheckoutName || buildPublicBusinessProfile(settings).brandName,
        description: settings.razorpayCheckoutDescription || `${buildPublicBusinessProfile(settings).brandName} ${params.type === 'shop_order' ? 'shop order' : 'custom quote'} ${orderSnapshot.orderNumber}`,
        reference: orderSnapshot.orderNumber,
        customer: {
          name: orderSnapshot.customerName,
          email: orderSnapshot.customerEmail,
          contact: orderSnapshot.customerPhone,
        },
        notes: {
          internal_order_type: params.type,
          internal_order_id: params.id,
          order_number: orderSnapshot.orderNumber,
          payment_purpose: paymentPurpose,
        },
        theme: {
          color: settings.razorpayBrandColor || settings.primaryColor || settings.secondaryColor || '#0f172a',
        },
      }),
      paymentAttempt: existing,
      orderSnapshot,
    }
  }

  if (existing && existing.amount_paise !== amountPaise && existing.status !== 'paid') {
    await updatePaymentAttemptStatus(
      existing.id,
      existing.status,
      'cancelled',
      {
        failed_at: new Date().toISOString(),
        failure_code: 'amount_changed',
        failure_description: 'A newer payment attempt was created after the order changed.',
      },
      systemReason(String(order.user_id), 'Amount changed before new attempt')
    )
  }

  const attemptNumber = existing && existing.amount_paise === amountPaise
    ? existing.attempt_number
    : (existing ? existing.attempt_number + 1 : 1)
  const receipt = makeReceipt(orderSnapshot.orderNumber.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 10) || 'FLX3D', attemptNumber)
  const idempotencyKey = createIdempotencyKey({
    type: params.type,
    orderId: params.id,
    paymentPurpose,
    attemptNumber,
    amountPaise,
  })

  const paymentAttempt = await upsertPaymentAttempt({
    internal_order_type: params.type,
    internal_order_id: params.id,
    customer_id: String(order.user_id),
    provider: 'razorpay',
    payment_purpose: paymentPurpose,
    provider_order_id: null,
    provider_payment_id: null,
    amount_paise: amountPaise,
    currency: 'INR',
    status: 'created',
    attempt_number: attemptNumber,
    idempotency_key: idempotencyKey,
    receipt,
    failure_code: null,
    failure_description: null,
    payment_method: null,
    captured_at: null,
    failed_at: null,
    metadata: {
      ...orderSnapshot.metadata,
      snapshot: orderSnapshot.pricingSnapshot,
      customer: {
        name: orderSnapshot.customerName,
        email: orderSnapshot.customerEmail,
        contact: orderSnapshot.customerPhone,
      },
    },
  })

  const providerOrder = await createRazorpayOrder({
    amountPaise,
    currency: 'INR',
    receipt,
    notes: {
      internal_order_type: params.type,
      internal_order_id: params.id,
      payment_attempt_id: paymentAttempt.id,
      order_number: orderSnapshot.orderNumber,
      payment_purpose: paymentPurpose,
    },
  })

  const updatedAttempt = await updatePaymentAttemptStatus(
    paymentAttempt.id,
    paymentAttempt.status,
    'pending',
    {
      provider_order_id: providerOrder.id,
      metadata: {
        ...paymentAttempt.metadata,
        razorpay: providerOrder,
      },
    },
    customerReason(String(order.user_id), 'Payment attempt created')
  )

  const currentOrderStatus: import('./types').PaymentStatus =
    (normalizeText(order.payment_status) as import('./types').PaymentStatus) || 'created'

  await updateOrderPaymentStatus({
    type: params.type,
    id: params.id,
    currentStatus: currentOrderStatus,
    nextStatus: 'pending',
    patch: {
      payment_provider: 'razorpay',
      payment_purpose: paymentPurpose,
      payment_attempt_id: updatedAttempt.id,
      provider_order_id: providerOrder.id,
      provider_payment_id: null,
      payment_amount_paise: amountPaise,
      payment_currency: 'INR',
      payment_snapshot: orderSnapshot.pricingSnapshot,
      payment_verified_at: null,
      payment_failed_at: null,
      payment_method: null,
      payment_refund_status: 'none',
      payment_refund_amount_paise: 0,
    },
    reason: customerReason(String(order.user_id), 'Payment attempt created'),
  })

  await insertPaymentAuditLog({
    actor_id: String(order.user_id),
    actor_role: 'customer',
    action: 'payment_attempt_created',
    entity_type: params.type,
    entity_id: params.id,
    previous_state: null,
    new_state: {
      payment_attempt_id: updatedAttempt.id,
      provider_order_id: providerOrder.id,
      amount_paise: amountPaise,
      payment_purpose: paymentPurpose,
    },
  })

  return {
    session: makeCheckoutSession({
      orderId: providerOrder.id,
      amount: amountPaise,
      currency: 'INR',
      name: buildPublicBusinessProfile(settings).brandName,
      description: `Flux3D ${params.type === 'shop_order' ? 'shop order' : 'custom quote'} ${orderSnapshot.orderNumber}`,
      reference: orderSnapshot.orderNumber,
      customer: {
        name: orderSnapshot.customerName,
        email: orderSnapshot.customerEmail,
        contact: orderSnapshot.customerPhone,
      },
      notes: {
        internal_order_type: params.type,
        internal_order_id: params.id,
        order_number: orderSnapshot.orderNumber,
        payment_purpose: paymentPurpose,
      },
      theme: {
        color: settings.primaryColor || settings.secondaryColor || '#0f172a',
      },
    }),
    paymentAttempt: updatedAttempt,
    orderSnapshot,
  }
}

export type VerifyCheckoutResult = {
  status: 'paid' | 'pending'
  paymentAttempt: PaymentAttemptRecord
  orderSnapshot: PaymentOrderSnapshot
}

export async function verifyCheckoutPayment(params: {
  internalOrderType: InternalOrderType
  internalOrderId: string
  customerId: string
  razorpayOrderId: string
  razorpayPaymentId: string
  razorpaySignature: string
}) : Promise<VerifyCheckoutResult> {
  const attempt = await fetchPaymentAttemptByProviderOrderId(params.razorpayOrderId)
  if (!attempt || attempt.internal_order_type !== params.internalOrderType || attempt.internal_order_id !== params.internalOrderId) {
    throw new Error('Payment attempt not found.')
  }

  if (attempt.customer_id !== params.customerId) {
    throw new Error('You are not allowed to verify this payment.')
  }

  const order = await fetchInternalOrder({
    type: params.internalOrderType,
    id: params.internalOrderId,
    customerId: params.customerId,
  })
  if (!order) throw new Error('Order not found.')

  const orderSnapshot = buildOrderSnapshot(order, params.internalOrderType)

  if (!verifyRazorpayCheckoutSignature({
    orderId: params.razorpayOrderId,
    paymentId: params.razorpayPaymentId,
    signature: params.razorpaySignature,
  })) {
    await updatePaymentAttemptStatus(
      attempt.id,
      attempt.status,
      'failed',
      {
        provider_payment_id: params.razorpayPaymentId,
        failed_at: new Date().toISOString(),
        failure_code: 'invalid_signature',
        failure_description: 'Checkout signature validation failed.',
      },
      systemReason(params.customerId, 'Checkout signature validation failed')
    )
    await updateOrderPaymentStatus({
      type: params.internalOrderType,
      id: params.internalOrderId,
      currentStatus: attempt.status,
      nextStatus: 'failed',
      patch: {
        provider_payment_id: params.razorpayPaymentId,
        payment_failed_at: new Date().toISOString(),
      },
      reason: systemReason(params.customerId, 'Checkout signature validation failed'),
    })
    throw new Error('Payment verification failed.')
  }

  const providerOrder = await fetchRazorpayOrder(params.razorpayOrderId)
  const providerPayment = await fetchRazorpayPayment(params.razorpayPaymentId)

  if (providerPayment.order_id !== params.razorpayOrderId || providerOrder.id !== params.razorpayOrderId) {
    throw new Error('Payment verification failed.')
  }

  if (Number(providerOrder.amount) !== orderSnapshot.amountPaise || providerOrder.currency !== orderSnapshot.currency) {
    throw new Error('Payment amount mismatch.')
  }

  const captured = providerPayment.status === 'captured' || providerPayment.captured === true || providerOrder.status === 'paid'
  const authorized = providerPayment.status === 'authorized'

  const nextStatus: PaymentStatus = captured ? 'paid' : authorized ? 'authorized' : 'pending'

  const updatedAttempt = await updatePaymentAttemptStatus(
    attempt.id,
    attempt.status,
    nextStatus,
    {
      provider_payment_id: providerPayment.id,
      payment_method: providerPayment.method ?? attempt.payment_method,
      captured_at: captured ? new Date().toISOString() : attempt.captured_at,
      failed_at: providerPayment.status === 'failed' ? new Date().toISOString() : attempt.failed_at,
      failure_code: providerPayment.error_code ?? null,
      failure_description: providerPayment.error_description ?? providerPayment.error_reason ?? null,
      metadata: {
        ...attempt.metadata,
        verification: {
          checkout: {
            razorpayOrderId: params.razorpayOrderId,
            razorpayPaymentId: params.razorpayPaymentId,
          },
          providerOrder,
          providerPayment,
        },
      },
    },
    customerReason(params.customerId, 'Checkout payment verified')
  )

  await updateOrderPaymentStatus({
    type: params.internalOrderType,
    id: params.internalOrderId,
    currentStatus: attempt.status,
    nextStatus,
    patch: {
      payment_provider: 'razorpay',
      provider_order_id: params.razorpayOrderId,
      provider_payment_id: params.razorpayPaymentId,
      payment_method: providerPayment.method ?? null,
      payment_verified_at: captured ? new Date().toISOString() : null,
      payment_failed_at: providerPayment.status === 'failed' ? new Date().toISOString() : null,
    },
    reason: customerReason(params.customerId, captured ? 'Payment captured' : `Payment ${nextStatus}`),
  })

  if (captured) {
    // Convert inventory reservations on successful payment
    if (params.internalOrderType === 'shop_order') {
      const adminSupabase = createAdminSupabaseClient()
      try {
        const { error: convError } = await adminSupabase.rpc('convert_inventory_reservations', { p_order_id: params.internalOrderId })
        if (convError) console.error('[payment] Failed to convert reservations:', convError)
      } catch {
        console.error('[payment] Failed to convert reservations')
      }
    }

    await insertPaymentAuditLog({
      actor_id: params.customerId,
      actor_role: 'customer',
      action: 'payment_attempt_verified',
      entity_type: params.internalOrderType,
      entity_id: params.internalOrderId,
      previous_state: { payment_status: attempt.status },
      new_state: { payment_status: 'paid', provider_payment_id: params.razorpayPaymentId },
    })

    return {
      status: 'paid',
      paymentAttempt: updatedAttempt,
      orderSnapshot,
    }
  }

  return {
    status: 'pending',
    paymentAttempt: updatedAttempt,
    orderSnapshot,
  }
}

function sanitizeEventPayload(payload: Record<string, unknown>) {
  const event = normalizeText(payload.event)
  const entity = isRecord(payload.payload) ? payload.payload : {}
  const payment = isRecord(entity.payment) ? entity.payment : {}
  const order = isRecord(entity.order) ? entity.order : {}
  const refund = isRecord(entity.refund) ? entity.refund : {}

  return {
    event,
    created_at: payload.created_at ?? null,
    payment: {
      id: payment.id ?? null,
      order_id: payment.order_id ?? null,
      status: payment.status ?? null,
      amount: payment.amount ?? null,
      currency: payment.currency ?? null,
      method: payment.method ?? null,
      captured: payment.captured ?? null,
      error_code: payment.error_code ?? null,
      error_description: payment.error_description ?? null,
      error_reason: payment.error_reason ?? null,
    },
    order: {
      id: order.id ?? null,
      amount: order.amount ?? null,
      currency: order.currency ?? null,
      status: order.status ?? null,
      amount_paid: order.amount_paid ?? null,
      amount_due: order.amount_due ?? null,
    },
    refund: {
      id: refund.id ?? null,
      payment_id: refund.payment_id ?? null,
      amount: refund.amount ?? null,
      status: refund.status ?? null,
      speed: refund.speed ?? null,
      reason: refund.reason ?? null,
    },
  }
}

async function processPaymentLifecycleEvent(eventName: string, payload: Record<string, unknown>) {
  const paymentEntity = isRecord(payload.payload) && isRecord(payload.payload.payment)
    ? asRecord(payload.payload.payment)
    : {}
  const orderEntity = isRecord(payload.payload) && isRecord(payload.payload.order)
    ? asRecord(payload.payload.order)
    : {}
  const providerOrderId = normalizeText(paymentEntity.order_id) || normalizeText(orderEntity.id)
  const providerPaymentId = normalizeText(paymentEntity.id)
  const providerPaymentStatus = normalizeText(paymentEntity.status)

  let attempt = providerOrderId ? await fetchPaymentAttemptByProviderOrderId(providerOrderId) : null
  if (!attempt && providerPaymentId) {
    attempt = await fetchPaymentAttemptByProviderPaymentId(providerPaymentId)
  }

  if (!attempt) {
    return { handled: false, processingStatus: 'ignored' as const }
  }

  if (eventName === 'payment.failed') {
    await updatePaymentAttemptStatus(
      attempt.id,
      attempt.status,
      'failed',
      {
        provider_payment_id: providerPaymentId || attempt.provider_payment_id,
        failed_at: new Date().toISOString(),
        failure_code: normalizeText(paymentEntity.error_code) || null,
        failure_description: normalizeText(paymentEntity.error_description) || normalizeText(paymentEntity.error_reason) || null,
        metadata: {
          ...attempt.metadata,
          webhook: sanitizeEventPayload(payload),
        },
      },
      systemReason(attempt.customer_id, `Webhook ${eventName}`)
    )

    await updateOrderPaymentStatus({
      type: attempt.internal_order_type,
      id: attempt.internal_order_id,
      currentStatus: attempt.status,
      nextStatus: 'failed',
      patch: {
        provider_payment_id: providerPaymentId || attempt.provider_payment_id,
        payment_failed_at: new Date().toISOString(),
      },
      reason: systemReason(attempt.customer_id, `Webhook ${eventName}`),
    })

    notifyPaymentFailed(attempt as Parameters<typeof notifyPaymentFailed>[0]).catch(() => {})

    return { handled: true, processingStatus: 'processed' as const }
  }

  if (eventName === 'payment.authorized' || eventName === 'payment.captured' || eventName === 'order.paid') {
    const payment = providerPaymentId ? await fetchRazorpayPayment(providerPaymentId) : null
    const order = providerOrderId ? await fetchRazorpayOrder(providerOrderId) : null
    const finalPayment = payment ?? {
      id: providerPaymentId,
      amount: Number(paymentEntity.amount ?? orderEntity.amount ?? attempt.amount_paise),
      currency: normalizeText(paymentEntity.currency) || normalizeText(orderEntity.currency) || attempt.currency,
      status: providerPaymentStatus || 'authorized',
      order_id: providerOrderId || attempt.provider_order_id || '',
      method: normalizeText(paymentEntity.method) || attempt.payment_method || undefined,
      captured: Boolean(paymentEntity.captured),
    }

    const captured = normalizeText(finalPayment.status) === 'captured' || Boolean((finalPayment as Record<string, unknown>).captured) || normalizeText(order?.status) === 'paid'
    const authorized = normalizeText(finalPayment.status) === 'authorized'

    const nextStatus: PaymentStatus = captured ? 'paid' : authorized ? 'authorized' : 'pending'

    await updatePaymentAttemptStatus(
      attempt.id,
      attempt.status,
      nextStatus,
      {
        provider_order_id: providerOrderId || attempt.provider_order_id,
        provider_payment_id: providerPaymentId || attempt.provider_payment_id,
        payment_method: normalizeText((finalPayment as Record<string, unknown>).method) || attempt.payment_method,
        captured_at: captured ? new Date().toISOString() : attempt.captured_at,
        metadata: {
          ...attempt.metadata,
          webhook: sanitizeEventPayload(payload),
        },
      },
      systemReason(attempt.customer_id, `Webhook ${eventName}`)
    )

    await updateOrderPaymentStatus({
      type: attempt.internal_order_type,
      id: attempt.internal_order_id,
      currentStatus: attempt.status,
      nextStatus,
      patch: {
        payment_provider: 'razorpay',
        provider_order_id: providerOrderId || attempt.provider_order_id,
        provider_payment_id: providerPaymentId || attempt.provider_payment_id,
        payment_method: normalizeText((finalPayment as Record<string, unknown>).method) || null,
        payment_verified_at: captured ? new Date().toISOString() : null,
        payment_failed_at: null,
      },
      reason: systemReason(attempt.customer_id, `Webhook ${eventName}`),
    })

    // Convert inventory reservations for shop orders on capture
    if (captured && attempt.internal_order_type === 'shop_order') {
      try {
        const adminSupabase = createAdminSupabaseClient()
        await adminSupabase.rpc('convert_inventory_reservations', { p_order_id: attempt.internal_order_id })
      } catch {
        console.error('[webhook] Failed to convert reservations')
      }
    }

    if (captured) {
      notifyPaymentCaptured(attempt as Parameters<typeof notifyPaymentCaptured>[0]).catch(() => {})
    }

    return { handled: true, processingStatus: 'processed' as const }
  }

  return { handled: false, processingStatus: 'ignored' as const }
}

async function processRefundEvent(eventName: string, payload: Record<string, unknown>) {
  const refundEntity = isRecord(payload.payload) && isRecord(payload.payload.refund)
    ? asRecord(payload.payload.refund)
    : {}
  const providerRefundId = normalizeText(refundEntity.id)
  if (!providerRefundId) return { handled: false, processingStatus: 'ignored' as const }

  const supabaseRefunds = await listPaymentRefunds(200)
  const localRefund = supabaseRefunds.find((refund) => refund.provider_refund_id === providerRefundId)
  if (!localRefund) return { handled: false, processingStatus: 'ignored' as const }

  const nextStatus = eventName === 'refund.failed'
    ? 'failed'
    : normalizeText(refundEntity.status) === 'processed' || eventName === 'refund.processed'
      ? 'processed'
      : 'pending'

  await updatePaymentRefund(localRefund.id, {
    provider_refund_id: providerRefundId,
    status: nextStatus,
    provider_response: {
      ...localRefund.provider_response,
      webhook: sanitizeEventPayload(payload),
    },
    processed_at: nextStatus === 'processed' ? new Date().toISOString() : localRefund.processed_at,
    failed_at: nextStatus === 'failed' ? new Date().toISOString() : localRefund.failed_at,
  })

  // Update parent payment attempt and order status
  const attempt = await fetchPaymentAttemptById(localRefund.payment_attempt_id)
  if (!attempt) return { handled: true, processingStatus: 'processed' as const }

  if (nextStatus === 'processed') {
    const attemptRefunds = await listPaymentRefunds(200)
    const totalRefunded = attemptRefunds
      .filter((r) => r.payment_attempt_id === attempt.id && ['pending', 'processed'].includes(r.status))
      .reduce((sum, r) => sum + Number(r.amount_paise), 0)
    const isFullyRefunded = totalRefunded >= attempt.amount_paise

    const attemptNextStatus: PaymentStatus = isFullyRefunded ? 'refunded' : 'partially_refunded'

    try {
      await updatePaymentAttemptStatus(
        attempt.id, attempt.status, attemptNextStatus, {},
        systemReason(attempt.customer_id, `Webhook ${eventName}`)
      )
      await updateOrderPaymentStatus({
        type: attempt.internal_order_type,
        id: attempt.internal_order_id,
        currentStatus: attempt.status,
        nextStatus: attemptNextStatus,
        patch: {
          payment_refund_status: isFullyRefunded ? 'completed' : 'partial',
          payment_refund_amount_paise: totalRefunded,
        },
        reason: systemReason(attempt.customer_id, `Webhook ${eventName}`),
      })
    } catch {
      // Status transition might fail if already in a terminal state — that's OK
    }

    await insertPaymentAuditLog({
      actor_role: 'system',
      action: 'refund_processed',
      entity_type: 'payment_refund',
      entity_id: localRefund.id,
      new_state: { status: nextStatus, total_refunded_paise: totalRefunded, fully_refunded: isFullyRefunded },
    })

    notifyRefundProcessed(attempt as Parameters<typeof notifyRefundProcessed>[0], localRefund.amount_paise).catch(() => {})
  }

  if (nextStatus === 'failed') {
    await updateOrderPaymentStatus({
      type: attempt.internal_order_type,
      id: attempt.internal_order_id,
      currentStatus: attempt.status,
      nextStatus: attempt.status,
      patch: { payment_refund_status: 'failed' },
      reason: systemReason(attempt.customer_id, `Webhook ${eventName}`),
    })
    await insertPaymentAuditLog({
      actor_role: 'system',
      action: 'refund_failed',
      entity_type: 'payment_refund',
      entity_id: localRefund.id,
      new_state: { status: 'failed', provider_refund_id: providerRefundId },
    })
  }

  return { handled: true, processingStatus: 'processed' as const }
}

export async function processRazorpayWebhook(params: {
  rawBody: string
  signature: string
  eventId: string
}) {
  const payload = JSON.parse(params.rawBody) as Record<string, unknown>
  const eventName = normalizeText(payload.event)
  if (!eventName) {
    throw new Error('Missing webhook event.')
  }

  const signatureVerified = verifyRazorpayWebhookSignature(params.rawBody, params.signature)
  if (!signatureVerified) {
    throw new Error('Invalid webhook signature.')
  }

  const existingEvent = await insertPaymentEvent({
    provider: 'razorpay',
    provider_event_id: params.eventId,
    event_type: eventName,
    provider_order_id: normalizeText(isRecord(payload.payload) && isRecord(payload.payload.order) ? payload.payload.order.id : null) || null,
    provider_payment_id: normalizeText(isRecord(payload.payload) && isRecord(payload.payload.payment) ? payload.payload.payment.id : null) || null,
    signature_verified: true,
    processing_status: 'received',
    retry_count: 0,
    sanitized_payload: sanitizeEventPayload(payload),
    processing_error: null,
  }).catch(async (error) => {
    const message = error instanceof Error ? error.message : ''
    if (!message.toLowerCase().includes('duplicate key')) {
      throw error
    }
    return null
  })

  if (!existingEvent) {
    return { acknowledged: true, duplicate: true }
  }

  await updatePaymentEvent(existingEvent.id, { processing_status: 'processing' })

  try {
    if (eventName.startsWith('refund.')) {
      await processRefundEvent(eventName, payload)
    } else {
      await processPaymentLifecycleEvent(eventName, payload)
    }

    await updatePaymentEvent(existingEvent.id, {
      processing_status: 'processed',
      processed_at: new Date().toISOString(),
      processing_error: null,
      retry_count: Number(existingEvent.retry_count ?? 0),
    })

    await insertPaymentAuditLog({
      actor_role: 'system',
      action: 'payment_webhook_processed',
      entity_type: 'payment_event',
      entity_id: existingEvent.id,
      new_state: { event: eventName, provider_event_id: params.eventId },
    })

    return { acknowledged: true, duplicate: false }
  } catch (error) {
    await updatePaymentEvent(existingEvent.id, {
      processing_status: 'failed',
      processed_at: null,
      processing_error: error instanceof Error ? error.message.slice(0, 500) : 'Webhook processing failed.',
      retry_count: Number(existingEvent.retry_count ?? 0) + 1,
    })
    throw error
  }
}

export async function initiateRefund(params: {
  paymentAttemptId: string
  amountPaise: number
  reason: string
  speed?: 'normal' | 'optimum'
  initiatedByAdminId: string
}) {
  const attempt = await fetchPaymentAttemptById(params.paymentAttemptId)
  if (!attempt) throw new Error('Payment attempt not found.')
  if (!['paid', 'captured', 'partially_refunded'].includes(attempt.status)) {
    throw new Error('Only captured payments can be refunded.')
  }

  const existingRefunds = await listPaymentRefunds(200)
  const refundedAmount = existingRefunds
    .filter((refund) => refund.payment_attempt_id === attempt.id && ['pending', 'processed'].includes(refund.status))
    .reduce((sum, refund) => sum + Number(refund.amount_paise ?? 0), 0)
  const refundable = calculateRefundableBalance(attempt.amount_paise, [refundedAmount])
  if (params.amountPaise <= 0 || params.amountPaise > refundable) {
    throw new Error('Refund amount exceeds the refundable balance.')
  }

  // Fail fast if Razorpay is not configured — no DB writes until gateway is reachable
  const razorpayConfig = getRazorpayConfig()
  if (!razorpayConfig) {
    throw new Error('Razorpay is not configured.')
  }

  const refundRow = await insertPaymentRefund({
    payment_attempt_id: attempt.id,
    provider_refund_id: null,
    amount_paise: params.amountPaise,
    status: 'created',
    reason: params.reason,
    speed: params.speed ?? null,
    initiated_by_admin_id: params.initiatedByAdminId,
    provider_response: {},
    processed_at: null,
    failed_at: null,
  })

  let response: RazorpayRefundResponse
  try {
    response = await createRazorpayRefund({
      paymentId: attempt.provider_payment_id || '',
      amountPaise: params.amountPaise,
      reason: params.reason,
      speed: params.speed,
      notes: {
        payment_attempt_id: attempt.id,
        internal_order_id: attempt.internal_order_id,
        internal_order_type: attempt.internal_order_type,
      },
    })
  } catch (razorpayError) {
    const errorMessage = razorpayError instanceof Error ? razorpayError.message : 'Refund creation failed at payment gateway.'
    await updatePaymentRefund(refundRow.id, {
      status: 'failed',
      provider_response: { error: errorMessage },
      failed_at: new Date().toISOString(),
    })
    await insertPaymentAuditLog({
      actor_id: params.initiatedByAdminId,
      actor_role: 'admin',
      action: 'refund_initiated',
      entity_type: 'payment_refund',
      entity_id: refundRow.id,
      previous_state: { status: 'created' },
      new_state: { status: 'failed', error: errorMessage },
    })
    throw new Error(`Refund failed at payment gateway: ${errorMessage}`)
  }

  const updatedRefund = await updatePaymentRefund(refundRow.id, {
    provider_refund_id: response.id,
    status: 'pending',
    provider_response: response,
  })

  const nextStatus = params.amountPaise === attempt.amount_paise ? 'refunded' : 'partially_refunded'
  await updatePaymentAttemptStatus(
    attempt.id,
    attempt.status,
    nextStatus,
    {},
    financeReason(params.initiatedByAdminId, `Refund initiated: ${params.reason}`)
  )

  await updateOrderPaymentStatus({
    type: attempt.internal_order_type,
    id: attempt.internal_order_id,
    currentStatus: attempt.status,
    nextStatus,
    patch: {
      payment_refund_status: params.amountPaise === attempt.amount_paise ? 'pending' : 'partial',
      payment_refund_amount_paise: refundedAmount + params.amountPaise,
    },
    reason: financeReason(params.initiatedByAdminId, `Refund initiated: ${params.reason}`),
  })

  await insertPaymentAuditLog({
    actor_id: params.initiatedByAdminId,
    actor_role: 'admin',
    action: 'refund_initiated',
    entity_type: 'payment_refund',
    entity_id: updatedRefund.id,
    previous_state: null,
    new_state: response,
  })

  return { refund: updatedRefund, providerResponse: response }
}

export async function getPaymentStatusForOrder(params: InternalOrderLookup) {
  const order = await fetchInternalOrder(params)
  if (!order) throw new Error('Order not found.')

  const paymentAttempt = await lookupPaymentAttemptByInternalOrder({
    internalOrderType: params.type,
    internalOrderId: params.id,
    paymentPurpose: getPaymentPurposeForOrder(params.type),
  })

  return {
    order: asRecord(order),
    paymentAttempt,
  }
}

export async function getPaymentAttemptDetail(paymentAttemptId: string) {
  const attempt = await fetchPaymentAttemptById(paymentAttemptId)
  if (!attempt) throw new Error('Payment attempt not found.')

  const [refunds, events, auditLogs] = await Promise.all([
    listPaymentRefunds(200),
    listPaymentEvents(100),
    listPaymentAuditLogs(100),
  ])

  const relatedRefunds = refunds.filter((refund) => refund.payment_attempt_id === attempt.id)
  const relatedEvents = events.filter((event) => event.provider_order_id === attempt.provider_order_id || event.provider_payment_id === attempt.provider_payment_id)
  const relatedAuditLogs = auditLogs.filter((log) => String(log.entity_id ?? '') === attempt.internal_order_id)
  const internalOrder = await fetchInternalOrder({
    type: attempt.internal_order_type,
    id: attempt.internal_order_id,
    customerId: attempt.customer_id,
  })

  return {
    attempt,
    internalOrder: internalOrder ? asRecord(internalOrder) : null,
    refunds: relatedRefunds,
    events: relatedEvents,
    auditLogs: relatedAuditLogs,
    providerDashboard: {
      paymentUrl: attempt.provider_payment_id ? `https://dashboard.razorpay.com/app/payments/${attempt.provider_payment_id}` : null,
      orderUrl: attempt.provider_order_id ? `https://dashboard.razorpay.com/app/orders/${attempt.provider_order_id}` : null,
    },
  }
}

export async function refreshPaymentAttemptFromProvider(attemptId: string) {
  const attempt = await fetchPaymentAttemptById(attemptId)
  if (!attempt || !attempt.provider_order_id) {
    throw new Error('Payment attempt not found.')
  }

  const providerOrder = await fetchRazorpayOrder(attempt.provider_order_id)
  const providerPaymentId = providerOrder.status === 'paid' ? attempt.provider_payment_id : attempt.provider_payment_id
  const providerPayment = providerPaymentId ? await fetchRazorpayPayment(providerPaymentId) : null
  const captured = providerPayment?.status === 'captured' || providerOrder.status === 'paid'

  const nextStatus: PaymentStatus = captured
    ? 'paid'
    : providerPayment?.status === 'authorized'
      ? 'authorized'
      : attempt.status

  if (nextStatus !== attempt.status) {
    await updatePaymentAttemptStatus(
      attempt.id,
      attempt.status,
      nextStatus,
      {
        provider_payment_id: providerPayment?.id ?? attempt.provider_payment_id,
        payment_method: providerPayment?.method ?? attempt.payment_method,
        captured_at: captured ? new Date().toISOString() : attempt.captured_at,
        metadata: {
          ...attempt.metadata,
          refresh: {
            providerOrder,
            providerPayment,
          },
        },
      },
      systemReason(attempt.customer_id, 'Refreshed payment status from provider')
    )

    await updateOrderPaymentStatus({
      type: attempt.internal_order_type,
      id: attempt.internal_order_id,
      currentStatus: attempt.status,
      nextStatus,
      patch: {
        provider_order_id: providerOrder.id,
        provider_payment_id: providerPayment?.id ?? attempt.provider_payment_id,
        payment_method: providerPayment?.method ?? attempt.payment_method ?? null,
        payment_verified_at: captured ? new Date().toISOString() : null,
      },
      reason: systemReason(attempt.customer_id, 'Refreshed payment status from provider'),
    })
  }

  return { attempt: await fetchPaymentAttemptById(attempt.id), providerOrder, providerPayment }
}

export async function getAdminPaymentsOverview(limit = 100) {
  const [attempts, refunds] = await Promise.all([
    listPaymentAttemptSummaries(limit),
    listPaymentRefundSummaries(limit),
  ])

  return { attempts, refunds }
}

export async function getAdminRefundsData(limit = 100) {
  const refunds = await listPaymentRefunds(limit)
  const attempts = await listPaymentAttemptsByProvider('razorpay', limit)
  return {
    refunds,
    attempts,
  }
}

export async function getWebhookHealthData(limit = 100) {
  const events = await listPaymentEvents(limit)
  const runs = await listReconciliationRuns(20)
  return {
    health: summarizeWebhookHealth(events),
    events,
    reconciliationRuns: runs,
  }
}

function rebuildWebhookPayload(eventType: string, payload: Record<string, unknown>) {
  const payment = asRecord(payload.payment)
  const order = asRecord(payload.order)
  const refund = asRecord(payload.refund)
  return {
    event: eventType,
    created_at: payload.created_at ?? null,
    payload: {
      payment,
      order,
      refund,
    },
  }
}

export async function reprocessStoredWebhookEvent(eventId: string) {
  const event = await fetchPaymentEvent('razorpay', eventId)
  if (!event) {
    throw new Error('Webhook event not found.')
  }
  if (event.signature_verified !== true) {
    throw new Error('Only verified webhook events can be reprocessed.')
  }

  const rebuiltPayload = rebuildWebhookPayload(event.event_type, event.sanitized_payload)
  await updatePaymentEvent(event.id, {
    processing_status: 'processing',
    processing_error: null,
  })

  try {
    if (event.event_type.startsWith('refund.')) {
      await processRefundEvent(event.event_type, rebuiltPayload)
    } else {
      await processPaymentLifecycleEvent(event.event_type, rebuiltPayload)
    }

    await updatePaymentEvent(event.id, {
      processing_status: 'processed',
      processed_at: new Date().toISOString(),
      processing_error: null,
    })

    return { reprocessed: true }
  } catch (error) {
    await updatePaymentEvent(event.id, {
      processing_status: 'failed',
      processed_at: null,
      processing_error: error instanceof Error ? error.message.slice(0, 500) : 'Webhook reprocessing failed.',
      retry_count: Number(event.retry_count ?? 0) + 1,
    })
    throw error
  }
}

export async function runPaymentReconciliation(limit = 100) {
  const attempts = await listPaymentAttemptsByProvider('razorpay', limit)
  const providerPayments = await listRazorpayPayments(limit)
  const normalizedPayments = Array.isArray(providerPayments)
    ? providerPayments.map((payment: Record<string, unknown>) => ({
        id: String(payment.id ?? ''),
        amount: Number(payment.amount ?? 0),
        currency: String(payment.currency ?? 'INR'),
        status: String(payment.status ?? ''),
      }))
    : []

  const summary = summarizeReconciliation(attempts, normalizedPayments)
  const run = await insertReconciliationRun({
    date_range_start: null,
    date_range_end: null,
    initiated_by: null,
    status: 'completed',
    matched_count: summary.totalProviderPayments - summary.mismatchCount - summary.missingLocallyCount,
    mismatch_count: summary.mismatchCount,
    missing_count: summary.missingLocallyCount,
    report: summary,
    started_at: new Date().toISOString(),
    completed_at: new Date().toISOString(),
  })

  return { run, summary, providerPayments: normalizedPayments }
}

async function listPaymentAttemptSummaries(limit: number) {
  const { createAdminSupabaseClient } = await import('@/lib/admin/server')
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_attempts')
    .select('id, internal_order_type, internal_order_id, customer_id, provider, payment_purpose, provider_order_id, provider_payment_id, amount_paise, currency, status, attempt_number, receipt, payment_method, captured_at, failed_at, created_at, updated_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => asRecord(row))
}

async function listPaymentRefundSummaries(limit: number) {
  const { createAdminSupabaseClient } = await import('@/lib/admin/server')
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_refunds')
    .select('id, payment_attempt_id, provider_refund_id, amount_paise, status, reason, speed, initiated_by_admin_id, created_at, processed_at, failed_at')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => asRecord(row))
}
