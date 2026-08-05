import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { sendBackInStock } from '@/lib/email/triggers'
import { formatVariantLabel } from '@/lib/shop/selection'

export const dynamic = 'force-dynamic'

/**
 * Notify the shelf_notify_me waitlist for a restocked SKU and mark the
 * requests as notified. Returns the number of emails queued.
 */
export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as { sku_id?: string }
    const skuId = String(body.sku_id ?? '')
    if (!skuId) return NextResponse.json({ error: 'SKU id is required.' }, { status: 400 })

    const supabase = createAdminSupabaseClient()

    const { data: sku, error: skuError } = await supabase
      .from('shelf_skus')
      .select('id, sku_code, variant_combination, stock_quantity, product:shelf_products(id, name, slug)')
      .eq('id', skuId)
      .maybeSingle()

    if (skuError) throw new Error(skuError.message)
    const skuRow = sku as unknown as {
      id: string
      sku_code: string
      variant_combination: Record<string, string | boolean>
      stock_quantity: number
      product: { id: string; name: string | null; slug: string | null } | null
    } | null
    if (!skuRow) return NextResponse.json({ error: 'SKU not found.' }, { status: 404 })
    if (Number(skuRow.stock_quantity) <= 0) {
      return NextResponse.json({ error: 'SKU is still out of stock.' }, { status: 400 })
    }

    const { data: entries, error: entriesError } = await supabase
      .from('shelf_notify_me')
      .select('id, email, user_id')
      .eq('sku_id', skuId)
      .eq('is_notified', false)

    if (entriesError) throw new Error(entriesError.message)

    const productName = String(skuRow.product?.name ?? 'Product')
    const productUrl = skuRow.product?.slug
      ? `https://flux3d.in/3d-shop/product/${skuRow.product.slug}`
      : 'https://flux3d.in/3d-shop'
    const variantLabel = formatVariantLabel(skuRow.variant_combination ?? {})

    let queued = 0
    for (const entry of entries ?? []) {
      try {
        await sendBackInStock(
          entry.user_id ?? null,
          entry.email,
          entry.email.split('@')[0] || 'there',
          productName,
          variantLabel,
          productUrl
        )
        queued += 1
      } catch (emailError) {
        console.error(`[stock/restock-notify] Failed to enqueue for ${entry.email}:`, emailError)
      }
    }

    if (queued > 0) {
      const ids = (entries ?? []).map((entry) => entry.id)
      const { error: updateError } = await supabase
        .from('shelf_notify_me')
        .update({ is_notified: true })
        .in('id', ids)

      if (updateError) throw new Error(updateError.message)
    }

    return NextResponse.json({ queued, total: entries?.length ?? 0 })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
