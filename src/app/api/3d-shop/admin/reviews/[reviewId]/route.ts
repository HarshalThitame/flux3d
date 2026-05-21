import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

type PatchBody = {
  is_approved?: unknown
}

export async function PATCH(request: Request, context: { params: Promise<{ reviewId: string }> }) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { reviewId } = await context.params
    const body = (await request.json()) as PatchBody

    if (typeof body.is_approved !== 'boolean') {
      return NextResponse.json({ error: 'is_approved must be boolean.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('shelf_reviews')
      .update({ is_approved: body.is_approved })
      .eq('id', reviewId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ review: data })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function DELETE(_request: Request, context: { params: Promise<{ reviewId: string }> }) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { reviewId } = await context.params
    const supabase = createAdminSupabaseClient()
    const { error } = await supabase
      .from('shelf_reviews')
      .delete()
      .eq('id', reviewId)

    if (error) throw new Error(error.message)
    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
