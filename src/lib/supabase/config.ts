function readEnv(name: string) {
  let value: string | undefined

  switch (name) {
    case 'NEXT_PUBLIC_SUPABASE_URL':
      value = process.env.NEXT_PUBLIC_SUPABASE_URL
      break
    case 'NEXT_PUBLIC_SUPABASE_ANON_KEY':
      value = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      break
    case 'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY':
      value = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
      break
    case 'NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET':
      value = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET
      break
    case 'SUPABASE_SERVICE_ROLE_KEY':
      value = process.env.SUPABASE_SERVICE_ROLE_KEY
      break
    case 'ADMIN_EMAILS':
      value = process.env.ADMIN_EMAILS
      break
    default:
      value = undefined
  }

  return typeof value === 'string' && value.length > 0 ? value : null
}

export function hasSupabaseConfig() {
  return Boolean(
    readEnv('NEXT_PUBLIC_SUPABASE_URL') &&
      (readEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY') ?? readEnv('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'))
  )
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

export function getSupabaseServiceRoleKey() {
  const key = readEnv('SUPABASE_SERVICE_ROLE_KEY')

  if (!key) {
    throw new Error('Missing SUPABASE_SERVICE_ROLE_KEY.')
  }

  return key
}

export function getAdminEmails() {
  return (readEnv('ADMIN_EMAILS') ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean)
}
