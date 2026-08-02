import { sendAccountLinkConfirmation } from '@/lib/email/triggers'
import { sendWhatsAppText } from '@/lib/whatsapp/messages'
import { logWhatsAppMessageToDb } from '@/lib/whatsapp/session'
import type { SupabaseClient } from '@supabase/supabase-js'

export interface AccountLinkFlowInput {
  from: string
  text: string
  supabase: SupabaseClient
  userId: string | null
}

/**
 * Two-turn Direction-A account linking flow.
 * Turn 1: user says "link my account" → ask for email.
 * Turn 2: user sends email → create link request, send magic link, reply with confirmation.
 *
 * Reuses the per-phone session pattern from whatsapp_order_sessions, but in link_requests.
 *
 * 24h-window guard: this flow is on-demand (customer initiates). Proactive prompts
 * outside the 24h window require a Meta Authentication template and opt-in.
 * See docs/24h-window-guard.md for details.
 */
export async function handleAccountLinkWhatsApp({
  from,
  text,
  supabase,
  userId,
}: AccountLinkFlowInput) {
  // Canonical phone: last 10 digits only
  const phone10 = from.replace(/[^0-9]/g, '').slice(-10)

  // --- Turn 1: detect link intent, ask for email ---
  const linkKeywords = /(link|connect|account|save to account|connect account)/i
  if (linkKeywords.test(text)) {
    await sendWhatsAppText(from, 'Sure — to link this WhatsApp number to your website account, please reply with the email you use to log in.')
    await logWhatsAppMessageToDb({ userId, sender: from, direction: 'outgoing', messageText: text, automated: true, triggerEvent: 'account_link_prompt' })
    return
  }

  // --- Turn 2: email received, create link request ---
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(text)) {
    // Not a valid email — re-prompt (keep the flow in the email-capture step)
    await sendWhatsAppText(from, "That doesn't look like an email. Please reply with the email you use to log in to the website.")
    await logWhatsAppMessageToDb({ userId, sender: from, direction: 'outgoing', messageText: text, automated: true, triggerEvent: 'account_link_email_prompt_invalid' })
    return
  }

  const email = text.trim().toLowerCase()
  const phone = phone10

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
    return
  }

  // Email found — create link request and send magic link
  const { data: linkResult, error: linkErr } = await supabase
    .from('link_requests')
    .insert({
      initiated_from: 'whatsapp',
      method: 'email_magic_link',
      target_user_id: profile.id,
      target_phone: phone,
      target_email: email,
      expires_at: new Date(Date.now() + 15 * 60_000).toISOString(),
    })
    .select('token')
    .maybeSingle()

  if (linkErr || !linkResult?.token) {
    console.error('[account-link] failed to create link request:', linkErr?.message)
    await sendWhatsAppText(from, genericReply)
    await logWhatsAppMessageToDb({ userId, sender: from, direction: 'outgoing', messageText: email, automated: true, triggerEvent: 'account_link_request_failed' })
    return
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
}