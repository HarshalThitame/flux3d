import { createAdminClient } from '@/lib/supabase/admin'
import { upsertProfileForUser } from '@/lib/auth/profile'

function normalizePhone(phone: string): string {
  return phone.replace(/[^0-9]/g, '')
}

// WhatsApp sends the sender number in international format (e.g. 919623023480).
// profiles.phone_number may be stored with or without the country prefix.
const PHONE_DOMAINS = ['@flux3d.in']

function buildSyntheticEmail(phone: string): string {
  return `wa+${phone}@flux3d.in`
}

export type WhatsappCustomer = {
  userId: string | null
  recognized: boolean
  created: boolean
}

export async function getOrCreateWhatsappCustomer(
  phone: string,
  options: { name?: string | null } = {}
): Promise<WhatsappCustomer> {
  const adminClient = createAdminClient()
  const normalized = normalizePhone(phone)

  if (!normalized) {
    return { userId: null, recognized: false, created: false }
  }

  // 1. Look up an existing profile by phone (with and without country code).
  const { data: existing } = await adminClient
    .from('profiles')
    .select('id')
    .or(`phone_number.eq.${normalized},phone_number.eq.+${normalized}`)
    .maybeSingle()

  if (existing?.id) {
    return { userId: String(existing.id), recognized: true, created: false }
  }

  // 2. Auto-provision a lightweight auth user + profile so orders can reference a valid auth.users id.
  const email = buildSyntheticEmail(normalized)
  const password = cryptoRandomPassword()

  const { data: createdUser, error: createError } = await adminClient.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      name: options.name?.trim() || 'WhatsApp Customer',
      phone: normalized,
      phone_number: normalized,
      whatsapp_auto_provisioned: true,
    },
  })

  if (createError || !createdUser?.user) {
    console.error('[whatsapp] Failed to auto-provision customer:', createError?.message ?? 'unknown')
    return { userId: null, recognized: false, created: false }
  }

  await upsertProfileForUser(adminClient, createdUser.user, options.name || 'WhatsApp Customer', normalized)

  return { userId: createdUser.user.id, recognized: false, created: true }
}

function cryptoRandomPassword(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  const bytes = new Uint8Array(24)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((byte) => chars[byte % chars.length])
    .join('')
}

export { PHONE_DOMAINS }
