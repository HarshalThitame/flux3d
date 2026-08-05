import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

/**
 * Release an active inventory reservation early: restores stock, marks the
 * reservation cancelled. Does not cancel the linked order — admins cancel the
 * order separately when needed.
 */
export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await context.params
    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase.rpc('release_reservation', {
      p_reservation_id: id,
    })

    if (error) throw new Error(error.message)

    return NextResponse.json({ result: data })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
