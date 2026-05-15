import { cache } from 'react'
import { redirect } from 'next/navigation'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { createAdminClient } from '@/lib/supabase/admin'

export function createAdminSupabaseClient() {
  return createAdminClient()
}

export async function isCurrentUserAdmin() {
  const auth = await getCurrentUserProfile()
  return Boolean(auth?.profile.isAdmin)
}

export const requireAdminUser = cache(async () => {
  const auth = await getCurrentUserProfile()

  if (!auth) {
    redirect('/login?next=%2Fadmin')
  }

  if (!auth.profile.isAdmin) {
    redirect('/')
  }

  return auth
})
