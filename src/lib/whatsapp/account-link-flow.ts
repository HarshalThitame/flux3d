import { sendAccountLinkConfirmation } from '@/lib/email/triggers'
import { sendWhatsAppText } from '@/lib/whatsapp/messages'
import { logWhatsAppMessageToDb } from '@/lib/whatsapp/session'
import { generateToken } from '@/lib/account-linking/tokens'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AccountLinkFlowInput {
  from: string
  text: string
  supabase: SupabaseClient
  userId: string | null
}

const LINK_KEYWORDS = /(link|connect|account|save to account|connect account)/i
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const FLOW_TTL_MS = 15 * 60_000

/**
 * Two-turn Direction-A account linking flow, driven by a persisted pending
 * `link_requests` row so the email-capture step survives across messages:
 * Turn 1: user says "link my account" → create a pending request + ask for email.
 * Turn 2: any later inbound message while that request is pending is treated
 *         as the email reply → look up the profile, send the magic link.
 *
 * Returns true when this handler consumed the message (webhook should stop),
 * false when the message is unrelated to linking (webhook continues).
 *
 * Enumeration-safe: the reply is identical whether or not the email exists.
 * 24h-window guard: this flow is on-demand (customer initiates). Proactive
 * prompts outside the 24h window require a Meta Authentication template and
 * opt-in. See docs/24h-window-guard.md for details.
 */
export async function handleAccountLinkWhatsApp({
  from,
  text,
  supabase,
  userId,
}: AccountLinkFlowInput): Promise<boolean> {
  // Canonical phone: last 10 digits only
  const phone10 = from.replace(/[^0-9]/g, '').slice(-10)
  if (!phone10) return false

  const pending = await getPendingWhatsAppRequest(supabase, phone10)

  // ── Turn 1: no flow in progress — only react to explicit link intents ──
  if (!pending) {
    if (!LINK_KEYWORDS.test(text)) return false

    // Clear any stale unconfirmed row for this phone (keeps the partial unique
    // index uq_link_requests_active_phone happy), then persist the pending state.
    await supabase
      .from('link_requests')
      .delete()
      .eq('target_phone', phone10)
      .is('confirmed_at', null)

    const { error: createError } = await supabase
      .from('link_requests')
      .insert({
        token: generateToken(),
        initiated_from: 'whatsapp',
        method: 'email_magic_link',
        target_phone: phone10,
        expires_at: new Date(Date.now() + FLOW_TTL_MS).toISOString(),
      })

    if (createError) {
      console.error('[account-link] failed to create pending request:', createError.message)
    }

    await sendWhatsAppText(from, 'Sure — to link this WhatsApp number to your website account, please reply with the email you use to log in.')
    await logWhatsAppMessageToDb({ userId, sender: from, direction: 'outgoing', messageText: text, automated: true, triggerEvent: 'account_link_prompt' })
    return true
  }

  // ── Turn 2: a flow is pending — expect the customer's login email ──
  if (!EMAIL_REGEX.test(text)) {
    // Not a valid email — keep the flow in the email-capture step
    await sendWhatsAppText(from, "That doesn't look like an email. Please reply with the email you use to log in to the website.")
    await logWhatsAppMessageToDb({ userId, sender: from, direction: 'outgoing', messageText: text, automated: true, triggerEvent: 'account_link_email_prompt_invalid' })
    return true
  }

  const email = text.trim().toLowerCase()

  // Look up the profile by email (admin lookup — enumeration-safe)
  const { data: profile } = await supabase
    .from('profiles')
    .select('id')
    .ilike('email', email)
    .maybeSingle()

  // Same reply regardless of whether the email exists (enumeration-safe)
  const genericReply = "If that email is registered, we've sent a confirmation link to it — click it to link this order to your account."

  if (!profile) {
    await sendWhatsAppText(from, genericReply)
    await logWhatsAppMessageToDb({ userId, sender: from, direction: 'outgoing', messageText: email, automated: true, triggerEvent: 'account_link_email_not_found' })
    return true
  }

  // Email found — attach it to the pending request and send the magic link.
  // Atomic: only updates a row still pending and unexpired.
  const { data: linkResult, error: linkErr } = await supabase
    .from('link_requests')
    .update({
      target_user_id: profile.id,
      target_email: email,
      expires_at: new Date(Date.now() + FLOW_TTL_MS).toISOString(),
    })
    .eq('id', pending.id)
    .is('confirmed_at', null)
    .gt('expires_at', new Date().toISOString())
    .select('token')
    .maybeSingle()

  if (linkErr || !linkResult?.token) {
    console.error('[account-link] failed to finalize link request:', linkErr?.message)
    await sendWhatsAppText(from, genericReply)
    await logWhatsAppMessageToDb({ userId, sender: from, direction: 'outgoing', messageText: email, automated: true, triggerEvent: 'account_link_request_failed' })
    return true
  }

  const token = linkResult.token
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flux3d.in'
  const confirmUrl = `${siteUrl}/link/confirm?token=${token}`

  // Count past orders for the phone from both tables (not yet owned by this user)
  const { count: shelfCount } = await supabase
    .from('shelf_orders')
    .select('id', { count: 'exact', head: true })
    .neq('user_id', profile.id)
    .filter('shipping_address->>phone', 'like', `%${phone10}`)

  const { count: customCount } = await supabase
    .from('orders')
    .select('id', { count: 'exact', head: true })
    .neq('user_id', profile.id)
    .filter('phone', 'like', `%${phone10}`)

  const totalPastOrders = (shelfCount ?? 0) + (customCount ?? 0)

  try {
    await sendAccountLinkConfirmation(
      profile.id,
      email,
      'there',
      confirmUrl,
      totalPastOrders,
      from
    )
  } catch (emailErr) {
    console.error('[account-link] failed to send email:', emailErr)
  }

  await sendWhatsAppText(from, `We've sent a confirmation link to ${email}. Click it to link this WhatsApp number to your account.`)
  await logWhatsAppMessageToDb({ userId, sender: from, direction: 'outgoing', messageText: email, automated: true, triggerEvent: 'account_link_email_sent' })
  return true
}

/** A pending, unexpired, WhatsApp-initiated link request for this phone. */
async function getPendingWhatsAppRequest(
  supabase: SupabaseClient,
  phone10: string,
): Promise<{ id: string } | null> {
  const { data } = await supabase
    .from('link_requests')
    .select('id')
    .eq('target_phone', phone10)
    .eq('initiated_from', 'whatsapp')
    .is('confirmed_at', null)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle()
  return (data ?? null) as { id: string } | null
}
