import { createAdminClient } from '@/lib/supabase/admin'

let cachedAdminEmail: string | null = null
let cachedAt = 0
const CACHE_TTL_MS = 300_000

export async function getAdminEmail(): Promise<string> {
  const now = Date.now()
  if (cachedAdminEmail && now - cachedAt < CACHE_TTL_MS) {
    return cachedAdminEmail
  }

  if (process.env.ADMIN_EMAIL) {
    cachedAdminEmail = process.env.ADMIN_EMAIL
    cachedAt = now
    return cachedAdminEmail
  }

  const supabase = createAdminClient()
  const { data } = await supabase
    .from('profiles')
    .select('email')
    .eq('is_admin', true)
    .limit(1)
    .maybeSingle()

  const email = data?.email ?? ''
  if (email) {
    cachedAdminEmail = email
    cachedAt = now
  }
  return email
}

export function clearAdminEmailCache() {
  cachedAdminEmail = null
  cachedAt = 0
}