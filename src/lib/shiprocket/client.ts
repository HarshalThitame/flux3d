import { getEnv } from '@/lib/env'
import { createAdminSupabaseClient } from '@/lib/admin/server'

const BASE_URL = 'https://apiv2.shiprocket.in/v1/external/'
const TOKEN_TTL_MS = 230 * 60 * 60 * 1000

type PersistedToken = { token: string; expiresAt: number }

type ShiprocketRequestOptions = {
  method?: 'GET' | 'POST'
  body?: Record<string, unknown>
}

let memoryToken: PersistedToken | null = null

export class ShiprocketError extends Error {
  readonly status?: number
  readonly payload?: unknown

  constructor(message: string, status?: number, payload?: unknown) {
    super(message)
    this.name = 'ShiprocketError'
    this.status = status
    this.payload = payload
  }
}

export function isShiprocketConfigured(): boolean {
  const env = getEnv()
  return Boolean(env.SHIPROCKET_EMAIL && env.SHIPROCKET_PASSWORD && env.SHIPROCKET_PICKUP_LOCATION)
}

export function getShiprocketPickupLocation(): string {
  const env = getEnv()
  if (!env.SHIPROCKET_PICKUP_LOCATION) {
    throw new ShiprocketError('Shiprocket pickup location is not configured (SHIPROCKET_PICKUP_LOCATION).')
  }
  return env.SHIPROCKET_PICKUP_LOCATION
}

async function readPersistedToken(): Promise<PersistedToken | null> {
  try {
    const supabase = createAdminSupabaseClient()
    const { data } = await supabase
      .from('shiprocket_settings')
      .select('value')
      .eq('key', 'auth_token')
      .maybeSingle()
    const value = data?.value as { token?: unknown; expiresAt?: unknown } | null
    if (
      value &&
      typeof value.token === 'string' &&
      typeof value.expiresAt === 'number' &&
      value.token &&
      Number.isFinite(value.expiresAt)
    ) {
      return { token: value.token, expiresAt: value.expiresAt }
    }
  } catch (error) {
    console.error('[shiprocket] Failed to read persisted token:', error)
  }
  return null
}

async function persistToken(token: string, expiresAt: number) {
  try {
    const supabase = createAdminSupabaseClient()
    await supabase.from('shiprocket_settings').upsert(
      {
        key: 'auth_token',
        value: { token, expiresAt },
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
  } catch (error) {
    console.error('[shiprocket] Failed to persist token:', error)
  }
}

async function login(): Promise<PersistedToken> {
  const env = getEnv()
  const email = env.SHIPROCKET_EMAIL
  const password = env.SHIPROCKET_PASSWORD
  if (!email || !password || !env.SHIPROCKET_PICKUP_LOCATION) {
    throw new ShiprocketError(
      'Shiprocket is not configured. SHIPROCKET_EMAIL, SHIPROCKET_PASSWORD and SHIPROCKET_PICKUP_LOCATION are required.'
    )
  }

  const response = await fetch(`${BASE_URL}auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
    cache: 'no-store',
  })
  const payload = (await response.json().catch(() => ({}))) as { token?: unknown; message?: unknown }
  if (!response.ok || typeof payload.token !== 'string' || !payload.token) {
    throw new ShiprocketError(
      `Shiprocket login failed (${response.status}): ${typeof payload.message === 'string' ? payload.message : response.statusText}`,
      response.status,
      payload
    )
  }

  return { token: payload.token, expiresAt: Date.now() + TOKEN_TTL_MS }
}

async function getToken(forceRefresh = false): Promise<string> {
  if (memoryToken && !forceRefresh && memoryToken.expiresAt > Date.now()) {
    return memoryToken.token
  }

  if (!forceRefresh) {
    const persisted = await readPersistedToken()
    if (persisted && persisted.expiresAt > Date.now()) {
      memoryToken = persisted
      return persisted.token
    }
  }

  const fresh = await login()
  await persistToken(fresh.token, fresh.expiresAt).catch(() => {})
  memoryToken = fresh
  return fresh.token
}

async function shiprocketFetch<T = unknown>(path: string, options: ShiprocketRequestOptions = {}): Promise<T> {
  const run = async (token: string) => {
    const response = await fetch(`${BASE_URL}${path}`, {
      method: options.method ?? 'GET',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: options.body ? JSON.stringify(options.body) : undefined,
      cache: 'no-store',
    })
    const payload = (await response.json().catch(() => ({}))) as T
    return { response, payload }
  }

  let { response, payload } = await run(await getToken())

  if (response.status === 401 || response.status === 403) {
    const retried = await run(await getToken(true))
    response = retried.response
    payload = retried.payload
  }

  if (!response.ok) {
    const message = (payload as { message?: unknown } | null)?.message
    throw new ShiprocketError(
      `Shiprocket ${path} failed (${response.status}): ${typeof message === 'string' && message ? message : response.statusText}`,
      response.status,
      payload
    )
  }

  return payload
}

export type ShiprocketOrderItem = {
  name: string
  sku: string
  units: number
  selling_price: number
}

export type CreateAdhocOrderInput = {
  order_id: string
  order_date: string
  pickup_location: string
  billing_customer_name: string
  billing_last_name?: string
  billing_address: string
  billing_address_2?: string
  billing_city: string
  billing_state: string
  billing_pincode: number
  billing_country?: string
  billing_email?: string
  billing_phone?: number
  shipping_is_billing?: boolean
  order_items: ShiprocketOrderItem[]
  payment_method?: 'Prepaid' | 'COD'
  sub_total: number
  length?: number
  breadth?: number
  height?: number
  weight?: number
}

export type CreateAdhocOrderResult = {
  order_id?: number
  shipment_id?: number
  awb_code?: string
}

export async function createAdhocOrder(input: CreateAdhocOrderInput): Promise<CreateAdhocOrderResult> {
  return shiprocketFetch<CreateAdhocOrderResult>('orders/create/adhoc', {
    method: 'POST',
    body: input as unknown as Record<string, unknown>,
  })
}

export type AssignAwbResult = {
  awb_assign_status?: number
  response?: {
    data?: {
      awb_code?: string
      courier_name?: string
      courier_company_id?: number
    }
  }
  data?: {
    awb_code?: string
    courier_name?: string
    courier_company_id?: number
  }
  awb_code?: string
  courier_name?: string
}

export async function assignAwb(shipmentId: number | string): Promise<AssignAwbResult> {
  return shiprocketFetch<AssignAwbResult>('courier/assign/awb', {
    method: 'POST',
    body: { shipment_id: shipmentId },
  })
}

export type PickupResponse = {
  pickup_status?: boolean
  response?: {
    awb_code?: string
    pickup_scheduled_date?: string
    pickup_token_number?: number
  }
}

export async function schedulePickup(
  shipmentId: number | string,
  pickupDate: string,
  pickupTime = 'Between 10 AM - 5 PM'
): Promise<PickupResponse> {
  return shiprocketFetch<PickupResponse>('courier/generate/pickup', {
    method: 'POST',
    body: {
      shipment_id: shipmentId,
      pickup_date: pickupDate,
      pickup_time: pickupTime,
    },
  })
}

export async function trackShipment(awb: string): Promise<Record<string, unknown>> {
  return shiprocketFetch<Record<string, unknown>>(`courier/track/awb/${encodeURIComponent(awb)}`)
}

export function istNow(): { date: string; dateTime: string } {
  const now = new Date()
  return {
    date: now.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' }),
    dateTime: now
      .toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata', hour12: false })
      .replace('T', ' ')
      .slice(0, 16),
  }
}
