import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { invalidateShopDataCache } from '@/lib/shop/public-data'

export const dynamic = 'force-dynamic'

const ALLOWED_REASONS = ['manual_adjust', 'restock', 'release', 'order_cancelled', 'order_returned']

/**
 * Bulk stock adjustment.
 * Body: { sku_ids: string[], mode: 'set' | 'add' | 'subtract', value: number,
 *         reason: string, note?: string }
 *
 * 'set' writes an absolute quantity (delta = value - current).
 * 'add'/'subtract' are relative deltas. Each SKU is adjusted through
 * admin_adjust_stock so every movement is individually audited.
 */
export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as {
      sku_ids?: string[]
      mode?: 'set' | 'add' | 'subtract'
      value?: number | string
      reason?: string
      note?: string
    }

    const skuIds = Array.isArray(body.sku_ids) ? body.sku_ids.filter(Boolean).map(String) : []
    const mode = String(body.mode ?? '') as 'set' | 'add' | 'subtract'
    const value = Number(body.value)
    const reason = String(body.reason ?? 'manual_adjust')
    const note = typeof body.note === 'string' && body.note.trim() ? body.note.trim() : null

    if (skuIds.length === 0) {
      return NextResponse.json({ error: 'At least one SKU is required.' }, { status: 400 })
    }
    if (!['set', 'add', 'subtract'].includes(mode)) {
      return NextResponse.json({ error: 'Mode must be set, add, or subtract.' }, { status: 400 })
    }
    if (!Number.isInteger(value) || value < 0) {
      return NextResponse.json({ error: 'Value must be a non-negative integer.' }, { status: 400 })
    }
    if (mode !== 'set' && value === 0) {
      return NextResponse.json({ error: 'Value must be non-zero for add/subtract.' }, { status: 400 })
    }
    if (!ALLOWED_REASONS.includes(reason)) {
      return NextResponse.json({ error: 'Invalid reason type.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    // Fetch current quantities to compute set-mode deltas.
    const { data: skus, error: fetchError } = await supabase
      .from('shelf_skus')
      .select('id, stock_quantity')
      .in('id', skuIds)

    if (fetchError) throw new Error(fetchError.message)

    const currentById = new Map(
      ((skus ?? []) as Array<{ id: string; stock_quantity: number }>).map((sku) => [
        sku.id,
        Number(sku.stock_quantity),
      ])
    )

    const results: Array<{ sku_id: string; ok: boolean; error?: string }> = []
    let applied = 0

    for (const skuId of skuIds) {
      const current = currentById.get(skuId)
      if (current === undefined) {
        results.push({ sku_id: skuId, ok: false, error: 'SKU not found' })
        continue
      }

      const delta =
        mode === 'set' ? value - current : mode === 'add' ? value : -value

      if (delta === 0) {
        results.push({ sku_id: skuId, ok: true })
        continue
      }

      const { error } = await supabase.rpc('admin_adjust_stock', {
        p_sku_id: skuId,
        p_quantity_delta: delta,
        p_reason: reason,
        p_note: note,
        p_actor_id: auth.user.id,
      })

      if (error) {
        results.push({ sku_id: skuId, ok: false, error: error.message })
      } else {
        results.push({ sku_id: skuId, ok: true })
        applied += 1
      }
    }

    const failed = results.filter((result) => !result.ok)
    if (applied > 0) invalidateShopDataCache()

    if (failed.length > 0 && applied === 0) {
      return NextResponse.json(
        {
          error: `Bulk adjustment failed. ${failed[0]?.error ?? 'Unknown error'}`,
          results,
        },
        { status: 400 }
      )
    }

    return NextResponse.json({
      applied,
      failed: failed.length,
      results,
      message: `${applied} SKU${applied === 1 ? '' : 's'} updated${failed.length ? `, ${failed.length} failed` : ''}.`,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
