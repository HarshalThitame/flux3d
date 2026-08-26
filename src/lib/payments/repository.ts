import { createAdminSupabaseClient } from '@/lib/admin/server'
import type {
  InternalOrderType,
  PaymentAttemptRecord,
  PaymentAuditAction,
  PaymentEventRecord,
  PaymentRefundRecord,
  PaymentStatus,
  PaymentPurpose,
  PaymentProvider,
  PaymentRefundStatus,
} from './types'

export type InternalOrderLookup = {
  type: InternalOrderType
  id: string
  customerId?: string
}

export type PaymentOrderSnapshot = {
  orderNumber: string
  amountPaise: number
  currency: string
  customerName: string
  customerEmail: string
  customerPhone: string
  billingName?: string | null
  billingEmail?: string | null
  billingPhone?: string | null
  lineItems: Array<Record<string, unknown>>
  shippingAddress?: Record<string, unknown> | null
  metadata: Record<string, unknown>
  currentPaymentStatus: PaymentStatus | null
  currentProviderOrderId: string | null
  currentProviderPaymentId: string | null
  pricingSnapshot: Record<string, unknown>
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {}
}

function normalizeText(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function normalizeMoney(value: unknown) {
  const next = Number(value)
  return Number.isFinite(next) ? Math.round(next * 100) : 0
}

function normalizeAmountFromPaise(value: unknown) {
  const next = Number(value)
  return Number.isFinite(next) ? next : 0
}

export async function fetchInternalOrder(lookup: InternalOrderLookup) {
  const supabase = createAdminSupabaseClient()
  const table = lookup.type === 'shop_order' ? 'shelf_orders' : 'orders'
  const idColumn = lookup.type === 'shop_order' ? 'id' : 'id'
  let query = supabase.from(table).select('*').eq(idColumn, lookup.id)

  if (lookup.customerId) {
    query = query.eq(lookup.type === 'shop_order' ? 'user_id' : 'user_id', lookup.customerId)
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  return data ? asRecord(data) : null
}

export function mapPaymentAttemptRow(row: Record<string, unknown>): PaymentAttemptRecord {
  return {
    id: String(row.id),
    internal_order_type: String(row.internal_order_type) as InternalOrderType,
    internal_order_id: String(row.internal_order_id),
    customer_id: row.customer_id ? String(row.customer_id) : null,
    provider: String(row.provider) as PaymentProvider,
    payment_purpose: String(row.payment_purpose) as PaymentPurpose,
    provider_order_id: row.provider_order_id ? String(row.provider_order_id) : null,
    provider_payment_id: row.provider_payment_id ? String(row.provider_payment_id) : null,
    amount_paise: normalizeAmountFromPaise(row.amount_paise),
    currency: String(row.currency ?? 'INR'),
    status: String(row.status) as PaymentStatus,
    attempt_number: Number(row.attempt_number ?? 1),
    idempotency_key: String(row.idempotency_key),
    receipt: row.receipt ? String(row.receipt) : null,
    failure_code: row.failure_code ? String(row.failure_code) : null,
    failure_description: row.failure_description ? String(row.failure_description) : null,
    payment_method: row.payment_method ? String(row.payment_method) : null,
    captured_at: row.captured_at ? String(row.captured_at) : null,
    failed_at: row.failed_at ? String(row.failed_at) : null,
    metadata: asRecord(row.metadata),
    created_at: String(row.created_at),
    updated_at: String(row.updated_at),
  }
}

export function mapPaymentEventRow(row: Record<string, unknown>): PaymentEventRecord {
  return {
    id: String(row.id),
    provider: String(row.provider) as PaymentProvider,
    provider_event_id: String(row.provider_event_id),
    event_type: String(row.event_type),
    provider_order_id: row.provider_order_id ? String(row.provider_order_id) : null,
    provider_payment_id: row.provider_payment_id ? String(row.provider_payment_id) : null,
    signature_verified: Boolean(row.signature_verified),
    processing_status: String(row.processing_status) as PaymentEventRecord['processing_status'],
    retry_count: Number(row.retry_count ?? 0),
    sanitized_payload: asRecord(row.sanitized_payload),
    processing_error: row.processing_error ? String(row.processing_error) : null,
    received_at: String(row.received_at),
    processed_at: row.processed_at ? String(row.processed_at) : null,
  }
}

export function mapPaymentRefundRow(row: Record<string, unknown>): PaymentRefundRecord {
  return {
    id: String(row.id),
    payment_attempt_id: String(row.payment_attempt_id),
    provider_refund_id: row.provider_refund_id ? String(row.provider_refund_id) : null,
    amount_paise: normalizeAmountFromPaise(row.amount_paise),
    status: String(row.status) as PaymentRefundStatus,
    reason: String(row.reason ?? ''),
    speed: row.speed === 'normal' || row.speed === 'optimum' ? row.speed : null,
    initiated_by_admin_id: row.initiated_by_admin_id ? String(row.initiated_by_admin_id) : null,
    provider_response: asRecord(row.provider_response),
    created_at: String(row.created_at),
    processed_at: row.processed_at ? String(row.processed_at) : null,
    failed_at: row.failed_at ? String(row.failed_at) : null,
  }
}

export async function fetchActivePaymentAttempt(params: {
  internalOrderType: InternalOrderType
  internalOrderId: string
  paymentPurpose: PaymentPurpose
  provider?: PaymentProvider
}) {
  const supabase = createAdminSupabaseClient()
  let query = supabase
    .from('payment_attempts')
    .select('*')
    .eq('internal_order_type', params.internalOrderType)
    .eq('internal_order_id', params.internalOrderId)
    .eq('payment_purpose', params.paymentPurpose)
    .in('status', ['created', 'pending', 'authorized', 'captured', 'paid'])
    .order('attempt_number', { ascending: false })
    .limit(1)

  if (params.provider) {
    query = query.eq('provider', params.provider)
  }

  const { data, error } = await query.maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapPaymentAttemptRow(asRecord(data)) : null
}

export async function fetchPaymentAttemptById(id: string) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('payment_attempts').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapPaymentAttemptRow(asRecord(data)) : null
}

export async function fetchPaymentAttemptByProviderOrderId(providerOrderId: string) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_attempts')
    .select('*')
    .eq('provider_order_id', providerOrderId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapPaymentAttemptRow(asRecord(data)) : null
}

export async function fetchPaymentAttemptByProviderPaymentId(providerPaymentId: string) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_attempts')
    .select('*')
    .eq('provider_payment_id', providerPaymentId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapPaymentAttemptRow(asRecord(data)) : null
}

export async function fetchPaymentAttemptByPaymentLinkId(paymentLinkId: string) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_attempts')
    .select('*')
    .filter('metadata->>payment_link_id', 'eq', paymentLinkId)
    .maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapPaymentAttemptRow(asRecord(data)) : null
}

export async function upsertPaymentAttempt(record: Omit<PaymentAttemptRecord, 'id' | 'created_at' | 'updated_at'> & { id?: string }) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_attempts')
    .upsert(record as Record<string, unknown>, { onConflict: 'idempotency_key' })
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error(`Failed to persist payment attempt (idempotency_key: ${String((record as Record<string, unknown>).idempotency_key ?? 'unknown')}).`)
  return mapPaymentAttemptRow(asRecord(data))
}

export async function updatePaymentAttempt(id: string, patch: Record<string, unknown>) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_attempts')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Payment attempt not found.')
  return mapPaymentAttemptRow(asRecord(data))
}

export async function insertPaymentEvent(record: Record<string, unknown>) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_events')
    .insert(record)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error(`Failed to persist payment event (provider_event_id: ${String((record as Record<string, unknown>).provider_event_id ?? 'unknown')}).`)
  return mapPaymentEventRow(asRecord(data))
}

export async function fetchPaymentEvent(provider: PaymentProvider, providerEventId: string) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_events')
    .select('*')
    .eq('provider', provider)
    .eq('provider_event_id', providerEventId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? mapPaymentEventRow(asRecord(data)) : null
}

/**
 * Look up a payment event by its internal table id (UUID).
 *
 * `processWebhookEventById` and the retry cron are handed the internal `id`
 * returned by `ingestRazorpayWebhook`, NOT the provider's event id. Looking up
 * by `provider_event_id` (a different column) there returns nothing and silently
 * strands the event as `received`, so this explicit by-id lookup is required.
 */
export async function fetchPaymentEventById(id: string): Promise<PaymentEventRecord | null> {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase.from('payment_events').select('*').eq('id', id).maybeSingle()
  if (error) throw new Error(error.message)
  return data ? mapPaymentEventRow(asRecord(data)) : null
}

export async function fetchCaptureEventForPayment(
  providerPaymentId: string,
  excludeEventId: string,
  captureEventTypes: string[]
) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_events')
    .select('id, event_type, processing_status, received_at')
    .eq('provider_payment_id', providerPaymentId)
    .in('event_type', captureEventTypes)
    .in('processing_status', ['processing', 'processed'])
    .neq('id', excludeEventId)
    .order('received_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? mapPaymentEventRow(asRecord(data)) : null
}

export async function updatePaymentEvent(id: string, patch: Record<string, unknown>) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_events')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Payment event not found.')
  return mapPaymentEventRow(asRecord(data))
}

export async function insertPaymentRefund(record: Record<string, unknown>) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_refunds')
    .insert(record)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error(`Failed to persist refund (payment_attempt_id: ${String((record as Record<string, unknown>).payment_attempt_id ?? 'unknown')}).`)
  return mapPaymentRefundRow(asRecord(data))
}

export async function updatePaymentRefund(id: string, patch: Record<string, unknown>) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_refunds')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Refund not found.')
  return mapPaymentRefundRow(asRecord(data))
}

export async function insertPaymentAuditLog(record: {
  actor_id?: string | null
  actor_role?: string
  action: PaymentAuditAction | string
  entity_type: string
  entity_id: string
  previous_state?: unknown
  new_state?: unknown
  request_context?: unknown
}) {
  const supabase = createAdminSupabaseClient()
  const { error } = await supabase.from('payment_audit_logs').insert({
    actor_id: record.actor_id ?? null,
    actor_role: record.actor_role ?? 'system',
    action: record.action.slice(0, 128),
    entity_type: record.entity_type.slice(0, 128),
    entity_id: record.entity_id.slice(0, 128),
    previous_state: record.previous_state ?? null,
    new_state: record.new_state ?? null,
    request_context: record.request_context ?? null,
  })

  if (error) throw new Error(error.message)
}

export async function listPaymentAttempts(limit = 50) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_attempts')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapPaymentAttemptRow(asRecord(row)))
}

export async function listPaymentRefunds(limit = 50) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_refunds')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapPaymentRefundRow(asRecord(row)))
}

export async function fetchPaymentRefundByProviderRefundId(providerRefundId: string) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_refunds')
    .select('*')
    .eq('provider_refund_id', providerRefundId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? mapPaymentRefundRow(asRecord(data)) : null
}

export async function listPaymentEvents(limit = 50) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_events')
    .select('*')
    .order('received_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapPaymentEventRow(asRecord(row)))
}

export async function listPaymentAuditLogs(limit = 100) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_audit_logs')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => asRecord(row))
}

export async function listPaymentRefundsByAttemptId(attemptId: string) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_refunds')
    .select('*')
    .eq('payment_attempt_id', attemptId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapPaymentRefundRow(asRecord(row)))
}

export async function listPaymentEventsByOrderOrPaymentId(
  providerOrderId?: string | null,
  providerPaymentId?: string | null
) {
  const supabase = createAdminSupabaseClient()
  let query = supabase.from('payment_events').select('*')

  if (providerOrderId && providerPaymentId) {
    query = query.or(`provider_order_id.eq.${providerOrderId},provider_payment_id.eq.${providerPaymentId}`)
  } else if (providerOrderId) {
    query = query.eq('provider_order_id', providerOrderId)
  } else if (providerPaymentId) {
    query = query.eq('provider_payment_id', providerPaymentId)
  } else {
    return []
  }

  const { data, error } = await query.order('received_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapPaymentEventRow(asRecord(row)))
}

export async function listPaymentAuditLogsByEntity(entityType: string, entityId: string) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_audit_logs')
    .select('*')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => asRecord(row))
}

export async function listReconciliationRuns(limit = 20) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('reconciliation_runs')
    .select('*')
    .order('started_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => asRecord(row))
}

export async function insertReconciliationRun(record: Record<string, unknown>) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('reconciliation_runs')
    .insert(record)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Failed to persist reconciliation run.')
  return asRecord(data)
}

export async function updateReconciliationRun(id: string, patch: Record<string, unknown>) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('reconciliation_runs')
    .update(patch)
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  if (!data) throw new Error('Reconciliation run not found.')
  return asRecord(data)
}

export async function listPaymentAttemptsByProvider(provider: PaymentProvider, limit = 200) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_attempts')
    .select('*')
    .eq('provider', provider)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw new Error(error.message)
  return (data ?? []).map((row) => mapPaymentAttemptRow(asRecord(row)))
}

export function snapshotAmount(value: number) {
  return Math.round(Number(value) * 100)
}

export function paiseToRupees(value: number) {
  return Math.round(Number(value) || 0) / 100
}

export function normalizeTextValue(value: unknown) {
  return normalizeText(value)
}

export function normalizePaiseValue(value: unknown) {
  return normalizeMoney(value)
}

export function buildPaymentSnapshotFromOrder(row: Record<string, unknown>, extras: Record<string, unknown>) {
  return {
    order: row,
    ...extras,
  }
}

export async function updateInternalOrderPaymentState(params: {
  type: InternalOrderType
  id: string
  patch: Record<string, unknown>
}) {
  const supabase = createAdminSupabaseClient()
  const table = params.type === 'shop_order' ? 'shelf_orders' : 'orders'
  const { data, error } = await supabase
    .from(table)
    .update(params.patch)
    .eq('id', params.id)
    .select('*')
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? asRecord(data) : null
}

export async function lookupPaymentAttemptByInternalOrder(params: {
  internalOrderType: InternalOrderType
  internalOrderId: string
  paymentPurpose: PaymentPurpose
}) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('payment_attempts')
    .select('*')
    .eq('internal_order_type', params.internalOrderType)
    .eq('internal_order_id', params.internalOrderId)
    .eq('payment_purpose', params.paymentPurpose)
    .order('attempt_number', { ascending: false })
    .limit(1)

  if (error) throw new Error(error.message)
  const row = Array.isArray(data) ? data[0] : null
  return row ? mapPaymentAttemptRow(asRecord(row)) : null
}

export async function bumpAttemptNumber(params: {
  internalOrderType: InternalOrderType
  internalOrderId: string
  paymentPurpose: PaymentPurpose
}) {
  const latest = await lookupPaymentAttemptByInternalOrder(params)
  return (latest?.attempt_number ?? 0) + 1
}
