import { createAdminClient } from '@/lib/supabase/admin'
import { canonicalPhone } from './tokens'
import type { MergeResult } from './types'

/**
 * Reassign every WhatsApp/shelf order placed under `phone` to the real
 * website account `targetUserId`.
 *
 * Delegates to the Postgres RPC `account_linking_merge_to_user(targetUserId,
 * phone)` so the reassignment is atomic and idempotent (it only touches rows
 * whose current `user_id` differs from the target). See
 * supabase/migrations/..._account_linking.sql.
 *
 * Matching is done on the last 10 digits of the digit-stripped phone so a
 * 12-digit WhatsApp wa_id ("919623023480") matches a 10-digit
 * `shipping_address->>'phone'` ("9623023480").
 */
export async function mergeWhatsAppOrdersToAccount(
  targetUserId: string,
  phone: string,
): Promise<MergeResult> {
  const db = createAdminClient()
  const canonical = canonicalPhone(phone)
  if (!canonical) {
    return { ordersAttributed: 0 }
  }

  const { data, error } = await db.rpc('account_linking_merge_to_user', {
    p_target_user_id: targetUserId,
    p_phone: canonical,
  })

  if (error) {
    console.error('[account-linking] merge rpc failed:', error.message)
    return { ordersAttributed: 0 }
  }

  const row = Array.isArray(data) ? data[0] : data
  const ordersAttributed = Number(row?.orders_attributed ?? 0)
  return { ordersAttributed }
}

/**
 * Soft-retire the synthetic WhatsApp customer whose orders were just merged
 * into a real account (decision (a) in the linking plan): mark the profile
 * `suspended` and stamp `user_metadata.merged_into` on the auth user so the
 * retired account is identifiable and excluded from future lookups.
 *
 * Synthetic profiles are created by getOrCreateWhatsappCustomer with
 * `phone_number` = the full wa_id (e.g. "919623023480") and email
 * `wa+<wa_id>@flux3d.in`. Matching on the last-10-digit suffix of the phone
 * resolves 12-digit wa_ids against 10-digit canonical phones, and the wa+
 * email check prevents retiring a real account that happens to share a suffix.
 */
export async function retireSyntheticWhatsappUser(
  targetUserId: string,
  phone: string,
): Promise<boolean> {
  const db = createAdminClient()
  const last10 = canonicalPhone(phone).slice(-10)
  if (!last10) return false

  const { data: candidates, error } = await db
    .from('profiles')
    .select('id, email')
    .ilike('phone_number', `%${last10}`)
    .neq('id', targetUserId)
    .limit(5)

  if (error) {
    console.error('[account-linking] synthetic lookup failed:', error.message)
    return false
  }

  const synthetic = (candidates ?? []).find(
    (p) => p.email?.startsWith('wa+') && p.email.endsWith('@flux3d.in')
  )
  if (!synthetic) return false

  const now = new Date().toISOString()
  await db
    .from('profiles')
    .update({
      status: 'suspended',
      suspended_at: now,
      suspended_reason: `Merged into account ${targetUserId} via WhatsApp account linking`,
    })
    .eq('id', synthetic.id)

  await db.auth.admin.updateUserById(synthetic.id, {
    user_metadata: { merged_into: targetUserId },
  })

  return true
}
