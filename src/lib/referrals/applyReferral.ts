'use server'

import { createAdminClient } from '@/lib/supabase/admin'

export async function applyReferralCode(referralCode: string, newUserId: string) {
  const normalizedCode = referralCode.trim().toUpperCase()
  if (!normalizedCode) {
    return { success: false, error: 'Referral code is required.' }
  }

  const supabase = createAdminClient()
  const { data: referrer, error: referrerError } = await supabase
    .from('profiles')
    .select('id, referral_code')
    .eq('referral_code', normalizedCode)
    .maybeSingle()

  if (referrerError) throw new Error(referrerError.message)
  if (!referrer) return { success: false, error: 'Invalid referral code.' }
  if (referrer.id === newUserId) return { success: false, error: 'Self-referrals are not allowed.' }

  const { data: existing, error: existingError } = await supabase
    .from('referrals')
    .select('id')
    .eq('referred_user_id', newUserId)
    .maybeSingle()

  if (existingError) throw new Error(existingError.message)
  if (existing) return { success: false, error: 'Referral already applied for this user.' }

  const { error } = await supabase.from('referrals').insert({
    referrer_user_id: referrer.id,
    referred_user_id: newUserId,
    referral_code: normalizedCode,
    reward_given: false,
  })

  if (error) throw new Error(error.message)
  return { success: true }
}
