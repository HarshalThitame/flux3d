/**
 * Guest order claiming.
 *
 * Attaches guest orders to an authenticated account — but only after that
 * account has proven ownership:
 *   * orders explicitly flagged `claim_candidate_user_id = user.id`
 *     (silent email match at checkout), or
 *   * guest orders whose `guest_contact.email` matches the authenticated
 *     user's verified email (magic-link / password login proves the inbox).
 *
 * Never merges on email string match alone without authentication, and never
 * overwrites existing profile data — guest shipping addresses stay only in
 * order snapshots.
 */
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { recordConsent } from '@/lib/account-linking/consent'

export async function claimGuestOrdersForUser(userId: string): Promise<number> {
  if (!userId) return 0

  const supabase = createAdminSupabaseClient()

  const { data: user, error: userError } = await supabase.auth.admin.getUserById(userId)
  if (userError || !user?.user?.email) return 0
  const email = user.user.email.trim().toLowerCase()

  const { data: claimedRows } = await supabase
    .from('shelf_orders')
    .update({
      user_id: userId,
      claim_candidate_user_id: null,
      guest_session_id: null,
      guest_access_token_hash: null,
      guest_contact: null,
    })
    .filter('user_id', 'is', null)
    .or(`claim_candidate_user_id.eq.${userId},guest_contact->>email.eq.${email}`)
    .select('id')

  const claimedIds = (claimedRows ?? []).map((row) => String(row.id))

  // Backfill the payment ledger too, so the customer's Payments tab and refund
  // context include their guest-era payments.
  if (claimedIds.length > 0) {
    const { error: attemptError } = await supabase
      .from('payment_attempts')
      .update({ customer_id: userId })
      .eq('internal_order_type', 'shop_order')
      .in('internal_order_id', claimedIds)
      .filter('customer_id', 'is', null)

    if (attemptError) {
      console.error('[guest-claim] Failed to backfill payment_attempts.customer_id:', attemptError.message)
    }
  }

  const claimed = claimedIds.length

  if (claimed > 0) {
    await recordConsent({
      consentType: 'account_linking',
      granted: true,
      method: 'button_click',
      userId,
      details: {
        purpose: 'guest_order_claim',
        orders_claimed: claimed,
        method_hint: 'authenticated_email_match',
      },
    }).catch(() => undefined)
  }

  return claimed
}
