function readEnv(name: string) {
  const value = process.env[name]
  return typeof value === 'string' && value.length > 0 ? value : null
}

export function getSupabaseUrl() {
  const url = readEnv('NEXT_PUBLIC_SUPABASE_URL')

  if (!url) {
    throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL.')
  }

  return url
}

export function getSupabasePublishableKey() {
  const key =
    readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ??
    readEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY')

  if (!key) {
    throw new Error(
      'Missing Supabase publishable key. Set NEXT_PUBLIC_SUPABASE_ANON_KEY or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.'
    )
  }

  return key
}
