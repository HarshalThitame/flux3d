import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { STOCK_REASON_LABELS } from '@/lib/shop/stock'

export const dynamic = 'force-dynamic'

const ALLOWED_REASONS = ['manual_adjust', 'restock', 'release', 'order_cancelled', 'order_returned']

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as {
      sku_id?: string
      quantity_delta?: number | string
      reason?: string
      note?: string
    }

    const skuId = String(body.sku_id ?? '')
    const quantityDelta = Number(body.quantity_delta)
    const reason = String(body.reason ?? 'manual_adjust')
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null

    if (!skuId) return NextResponse.json({ error: 'SKU id is required.' }, { status: 400 })
    if (!Number.isInteger(quantityDelta) || quantityDelta === 0) {
      return NextResponse.json({ error: 'Quantity delta must be a non-zero integer.' }, { status: 400 })
    }
    if (!ALLOWED_REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason type.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase.rpc('admin_adjust_stock', {
      p_sku_id: skuId,
      p_quantity_delta: quantityDelta,
      p_reason: reason,
      p_note: note,
      p_actor_id: auth.user.id,
    })

    if (error) throw new Error(error.message)

    return NextResponse.json({
      result: data,
      reasonLabel: STOCK_REASON_LABELS[reason as keyof typeof STOCK_REASON_LABELS] ?? reason,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
