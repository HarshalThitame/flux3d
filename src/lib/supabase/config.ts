export function hasSupabaseConfig() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      (process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY)
  )
}

export function getSupabaseUrl() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.')
  return url
}

export function getSupabasePublishableKey() {
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  if (!key) throw new Error('Missing Supabase publishable key.')
  return key
}

export function getSupabaseServiceRoleKey() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!key) throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.')
  return key
}

export function isAdminEmail(email: string | null | undefined) {
  const normalizedEmail = email?.trim().toLowerCase() ?? ''
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase()
  if (!adminEmail || !normalizedEmail) return false
  return normalizedEmail === adminEmail
}
