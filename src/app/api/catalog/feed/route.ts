import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import crypto from 'node:crypto'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'
export const maxDuration = 120

async function verifyCronAuth(request: Request): Promise<boolean> {
  const cronSecret = process.env.CRON_SECRET
  if (!cronSecret) return false
  const authHeader = request.headers.get('authorization')
  if (!authHeader || !authHeader.startsWith('Bearer ')) return false
  try {
    return crypto.timingSafeEqual(
      Buffer.from(authHeader.slice(7)),
      Buffer.from(cronSecret),
    )
  } catch {
    return false
  }
}

export async function GET(request: Request) {
  if (!(await verifyCronAuth(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!supabaseUrl || !serviceKey) {
    return NextResponse.json({ error: 'Missing Supabase config' }, { status: 500 })
  }

  const supabase = createClient(supabaseUrl, serviceKey)

  const { data: products, error } = await supabase
    .from('shelf_products')
    .select(`
      id, name, slug, description, thumbnail_url, image_urls,
      is_active, is_archived, base_price,
      category:category_id(name),
      skus:shelf_skus(id, sku_code, price, stock_quantity, is_available, variant_combination, variant_image_url)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const baseUrl = (process.env.NEXT_PUBLIC_SITE_URL || 'https://flux3d.in').replace(/\/+$/, '')
  const feed = (products ?? []).flatMap((product) => {
    const skus = product.skus ?? []
    if (skus.length === 0) {
      const image = product.thumbnail_url || product.image_urls?.[0]
      return [{
        id: product.slug,
        title: product.name,
        description: product.description,
        availability: product.is_active && !product.is_archived ? 'in stock' : 'out of stock',
        condition: 'new',
        price: `${product.base_price.toFixed(2)} INR`,
        link: `${baseUrl}/3d-shop/product/${product.slug}`,
        image_link: image || undefined,
        brand: 'Flux3D',
        google_product_category: 'Electronics > 3D Printing',
      }]
    }
    return skus.map((sku) => {
      const variantParts = Object.entries(sku.variant_combination ?? {}).map(([k, v]) => `${k}:${v}`)
      const variantLabel = variantParts.join(', ')
      const image = sku.variant_image_url || product.thumbnail_url || product.image_urls?.[0]
      return {
        id: sku.sku_code,
        item_group_id: product.slug,
        title: variantLabel ? `${product.name} — ${variantLabel}` : product.name,
        description: product.description,
        availability: sku.stock_quantity > 0 ? 'in stock' : sku.is_available ? 'preorder' : 'out of stock',
        condition: 'new',
        price: `${(sku.price || product.base_price).toFixed(2)} INR`,
        sale_price: sku.price < product.base_price ? `${sku.price.toFixed(2)} INR` : undefined,
        link: `${baseUrl}/3d-shop/product/${product.slug}?sku=${sku.sku_code}`,
        image_link: image || undefined,
        brand: 'Flux3D',
        google_product_category: 'Electronics > 3D Printing',
        color: typeof sku.variant_combination?.color === 'string' ? sku.variant_combination.color : typeof sku.variant_combination?.Color === 'string' ? sku.variant_combination.Color : undefined,
        material: typeof sku.variant_combination?.material === 'string' ? sku.variant_combination.material : typeof sku.variant_combination?.Material === 'string' ? sku.variant_combination.Material : undefined,
        size: typeof sku.variant_combination?.size === 'string' ? sku.variant_combination.size : typeof sku.variant_combination?.Size === 'string' ? sku.variant_combination.Size : undefined,
        inventory: sku.stock_quantity,
      }
    })
  })

  return NextResponse.json({ products: feed, total: feed.length })
}

export async function POST() {
  return NextResponse.json({ error: 'Method not allowed' }, { status: 405 })
}
