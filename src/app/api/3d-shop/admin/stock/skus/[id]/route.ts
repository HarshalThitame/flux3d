import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

type PatchBody = {
  low_stock_threshold?: number | string | null
  reorder_point?: number | string | null
  is_available?: boolean
  pre_order_eta?: string | null
  price?: number | string
}

function nullableNumber(value: number | string | null | undefined): number | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function nullableDate(value: string | null | undefined): string | null | undefined {
  if (value === undefined) return undefined
  if (value === null || value === '') return null
  const parsed = new Date(value)
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString()
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await context.params
    const body = (await request.json()) as PatchBody

    const supabase = createAdminSupabaseClient()

    const updates: Record<string, unknown> = {}

    const threshold = nullableNumber(body.low_stock_threshold)
    if (threshold !== undefined) {
      if (threshold !== null && threshold < 0) {
        return NextResponse.json({ error: 'Low stock threshold must be 0 or greater.' }, { status: 400 })
      }
      updates.low_stock_threshold = threshold
    }

    const reorderPoint = nullableNumber(body.reorder_point)
    if (reorderPoint !== undefined) {
      if (reorderPoint !== null && reorderPoint < 0) {
        return NextResponse.json({ error: 'Reorder point must be 0 or greater.' }, { status: 400 })
      }
      updates.reorder_point = reorderPoint
    }

    if (typeof body.is_available === 'boolean') updates.is_available = body.is_available

    const preOrderEta = nullableDate(body.pre_order_eta)
    if (preOrderEta !== undefined) updates.pre_order_eta = preOrderEta

    if (body.price !== undefined) {
      const price = Number(body.price)
      if (!Number.isFinite(price) || price < 0) {
        return NextResponse.json({ error: 'Invalid price.' }, { status: 400 })
      }
      updates.price = price
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update.' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('shelf_skus')
      .update(updates)
      .eq('id', id)
      .select('id, sku_code')
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ sku: data })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
