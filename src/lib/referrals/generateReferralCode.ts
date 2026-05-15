import { createAdminClient } from '@/lib/supabase/admin'

function buildCode(userId: string) {
  const first4 = userId.replace(/-/g, '').slice(0, 4).toUpperCase()
  const random4 = String(Math.floor(Math.random() * 10000)).padStart(4, '0')
  return `FLUX-${first4}-${random4}`
}

export async function generateReferralCode(userId: string) {
  const supabase = createAdminClient()

  for (let attempt = 0; attempt < 10; attempt += 1) {
    const referralCode = buildCode(userId)
    const { data: existing, error: lookupError } = await supabase
      .from('profiles')
      .select('id')
      .eq('referral_code', referralCode)
      .maybeSingle()

    if (lookupError) throw new Error(lookupError.message)
    if (existing) continue

    const { error } = await supabase
      .from('profiles')
      .update({ referral_code: referralCode })
      .eq('id', userId)

    if (error) throw new Error(error.message)
    return referralCode
  }

  throw new Error('Failed to generate a unique referral code.')
}
