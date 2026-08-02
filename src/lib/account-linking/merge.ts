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
