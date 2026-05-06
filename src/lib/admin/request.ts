import { NextResponse } from 'next/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { isAdminEmail } from '@/lib/supabase/config'

export async function requireAdminRequest() {
  const supabase = await createServerSupabaseClient()
  const { data, error } = await supabase.auth.getUser()

  if (error) {
    if (error.code === 'refresh_token_not_found') {
      return { response: NextResponse.json({ error: 'Session expired' }, { status: 401 }) }
    }
    return { response: NextResponse.json({ error: error.message }, { status: 401 }) }
  }

  const user = data.user

  if (!user) {
    return { response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) }
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .maybeSingle()

  if (profileError) {
    return { response: NextResponse.json({ error: profileError.message }, { status: 500 }) }
  }

  if (profile?.role !== 'admin' && !isAdminEmail(profile?.email ?? user.email)) {
    return { response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }) }
  }

  return { supabase, user }
}
