import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { getAdminEmails } from '@/lib/supabase/config'

export async function requireAdminRequest() {
  const supabase = await createServerSupabaseClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    return { response: NextResponse.json({ error: error.message }, { status: 401 }) }
  }

  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const adminEmails = getAdminEmails()
  const email = user.email?.trim().toLowerCase() ?? ''

  if (adminEmails.length > 0 && !adminEmails.includes(email)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, user }
}
