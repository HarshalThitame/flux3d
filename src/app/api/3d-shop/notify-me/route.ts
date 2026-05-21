import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type NotifyMeBody = {
  productId?: unknown
  skuId?: unknown
  email?: unknown
}

function isDuplicateError(error: unknown) {
  if (!error || typeof error !== 'object') return false
  const record = error as { code?: string; message?: string }
  return record.code === '23505' || Boolean(record.message?.toLowerCase().includes('duplicate key'))
}

function normalizeEmail(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : ''
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as NotifyMeBody
    const productId = typeof body.productId === 'string' ? body.productId.trim() : ''
    const skuId = typeof body.skuId === 'string' ? body.skuId.trim() : ''
    const email = normalizeEmail(body.email)

    if (!productId || !skuId) {
      return NextResponse.json({ error: 'Product and SKU are required.' }, { status: 400 })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: 'Enter a valid email address.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data: sku, error: skuError } = await supabase
      .from('shelf_skus')
      .select('id, product_id, stock_quantity, is_available')
      .eq('id', skuId)
      .eq('product_id', productId)
      .maybeSingle()

    if (skuError) throw new Error(skuError.message)
    if (!sku) return NextResponse.json({ error: 'SKU not found.' }, { status: 404 })

    if (Number(sku.stock_quantity ?? 0) > 0 && sku.is_available !== false) {
      return NextResponse.json({ error: 'This item is currently in stock.' }, { status: 400 })
    }

    const authSupabase = await createServerSupabaseClient()
    const { data: authData } = await authSupabase.auth.getUser()
    const userId = authData.user?.id ?? null

    const { error } = await supabase.from('shelf_notify_me').insert({
      product_id: productId,
      sku_id: skuId,
      email,
      user_id: userId,
    })

    if (error) {
      if (isDuplicateError(error)) {
        return NextResponse.json({ success: true, message: "You're already on the list!" })
      }
      throw new Error(error.message)
    }

    return NextResponse.json({ success: true, message: "We'll notify you when it's back in stock!" })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to save notification request.' },
      { status: 500 }
    )
  }
}
