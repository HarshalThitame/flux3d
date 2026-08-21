import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { invalidateShopDataCache } from '@/lib/shop/public-data'

export const dynamic = 'force-dynamic'

type PatchBody = {
  is_approved?: unknown
  admin_reply?: unknown
}

export async function PATCH(request: Request, context: { params: Promise<{ reviewId: string }> }) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { reviewId } = await context.params
    const body = (await request.json()) as PatchBody
    const updates: Record<string, unknown> = {}

    if (typeof body.is_approved === 'boolean') {
      updates.is_approved = body.is_approved
    }
    if (typeof body.admin_reply === 'string') {
      updates.admin_reply = body.admin_reply.trim() || null
      updates.admin_replied_at = body.admin_reply.trim() ? new Date().toISOString() : null
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('shelf_reviews')
      .update(updates)
      .eq('id', reviewId)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    invalidateShopDataCache()
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
    invalidateShopDataCache()
    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
