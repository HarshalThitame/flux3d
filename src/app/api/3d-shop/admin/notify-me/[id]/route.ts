import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

type PatchBody = {
  is_notified?: unknown
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await context.params
    const body = (await request.json()) as PatchBody

    if (typeof body.is_notified !== 'boolean') {
      return NextResponse.json({ error: 'is_notified must be boolean.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('shelf_notify_me')
      .update({ is_notified: body.is_notified })
      .eq('id', id)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ entry: data })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
