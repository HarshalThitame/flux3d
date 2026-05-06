import { cache } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@supabase/supabase-js'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '@/lib/supabase/config'

export function createAdminSupabaseClient() {
  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

export const requireAdminUser = cache(async () => {
  const auth = await getCurrentUserProfile()

  if (!auth) {
    redirect('/login?next=%2Fadmin')
  }

  if (auth.profile.role !== 'admin') {
    redirect('/')
  }

  return auth
})
