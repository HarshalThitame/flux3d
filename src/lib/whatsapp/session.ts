import { createClient, type SupabaseClient } from '@supabase/supabase-js'

let cachedServiceClient: SupabaseClient | null = null

function getServiceClient(): SupabaseClient | null {
  if (cachedServiceClient) return cachedServiceClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) return null
  cachedServiceClient = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: {
      fetch: (input: RequestInfo | URL, init?: RequestInit) => {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 15000)
        return fetch(input, { ...init, signal: controller.signal })
          .finally(() => clearTimeout(timeout))
      },
    },
  })
  return cachedServiceClient
}

const ORDER_TTL_MINUTES = Math.max(5, Number(process.env.WHATSAPP_ORDER_EXPIRY_MINUTES ?? 30) || 30)

export type OrderSessionState = Record<string, unknown>

export type OrderSession = {
  phoneNumber: string
  step: string
  state: OrderSessionState
}

export async function getOrderSession(phoneNumber: string): Promise<OrderSession | null> {
  const supabase = getServiceClient()
  if (!supabase) return null

  const { data, error } = await supabase
    .from('whatsapp_order_sessions')
    .select('phone_number, step, state, expires_at, updated_at')
    .eq('phone_number', phoneNumber)
    .maybeSingle()

  if (error || !data) return null
  if (new Date(data.expires_at).getTime() < Date.now()) {
    try {
      await supabase.from('whatsapp_order_sessions').delete().eq('phone_number', phoneNumber)
    } catch {
      // ignore cleanup errors
    }
    return null
  }

  return {
    phoneNumber: data.phone_number,
    step: data.step,
    state: (data.state ?? {}) as OrderSessionState,
  }
}

export async function saveOrderSession(
  phoneNumber: string,
  step: string,
  state: OrderSessionState
): Promise<void> {
  const supabase = getServiceClient()
  if (!supabase) return

  const expiresAt = new Date(Date.now() + ORDER_TTL_MINUTES * 60 * 1000).toISOString()
  try {
    await supabase.from('whatsapp_order_sessions').upsert({
      phone_number: phoneNumber,
      step,
      state,
      expires_at: expiresAt,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'phone_number' })
  } catch (err) {
    console.error('[whatsapp] Failed to save order session:', err)
  }
}

export async function clearOrderSession(phoneNumber: string): Promise<void> {
  const supabase = getServiceClient()
  if (!supabase) return
  try {
    await supabase.from('whatsapp_order_sessions').delete().eq('phone_number', phoneNumber)
  } catch (err) {
    console.error('[whatsapp] Failed to clear order session:', err)
  }
}

export async function logWhatsAppMessageToDb(entry: {
  userId: string | null
  sender: string | null
  direction: 'incoming' | 'outgoing'
  messageText: string
  automated: boolean
  triggerEvent: string | null
  responded?: boolean
  responseTimeMinutes?: number | null
}): Promise<void> {
  const supabase = getServiceClient()
  if (!supabase) return

  const { error } = await supabase.from('whatsapp_messages').insert({
    user_id: entry.userId,
    sender: entry.sender,
    direction: entry.direction,
    message_text: entry.messageText,
    automated: entry.automated,
    trigger_event: entry.triggerEvent,
    responded: entry.responded ?? false,
    response_time_minutes: entry.responseTimeMinutes ?? null,
  })

  if (error) {
    console.error('[whatsapp] Failed to log message:', error)
  }
}
