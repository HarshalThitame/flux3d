import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

type ProductPayload = {
  id?: string
  name?: string
  slug?: string
  description?: string | null
  long_description?: string | null
  category_id?: string | null
  tags?: string[]
  occasion_tags?: string[]
  thumbnail_url?: string | null
  image_urls?: string[] | null
  image_alt?: Record<string, string> | null
  model_url?: string | null
  base_price?: number
  is_customizable?: boolean
  customization_label?: string | null
  is_featured?: boolean
  is_active?: boolean
  is_archived?: boolean
  meta_title?: string | null
  meta_description?: string | null
  published_at?: string | null
}

type SkuRow = {
  id: string
  stock_quantity: number
  low_stock_threshold: number | null
  is_available: boolean | null
}

function normalizeStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : []
}

function normalizeProductPayload(body: ProductPayload, partial = false) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const slug = typeof body.slug === 'string' ? body.slug.trim() : ''

  if (!partial && !name) throw new Error('Product name is required.')
  if (!partial && !slug) throw new Error('Product slug is required.')

  return {
    ...(name || !partial ? { name } : {}),
    ...(slug || !partial ? { slug } : {}),
    description: typeof body.description === 'string' ? body.description.trim() || null : body.description ?? null,
    long_description: typeof body.long_description === 'string' ? body.long_description : body.long_description ?? null,
    category_id: body.category_id || null,
    tags: normalizeStringArray(body.tags),
    occasion_tags: normalizeStringArray(body.occasion_tags),
    thumbnail_url: typeof body.thumbnail_url === 'string' ? body.thumbnail_url.trim() || null : body.thumbnail_url ?? null,
    image_urls: normalizeStringArray(body.image_urls),
    image_alt:
      body.image_alt && typeof body.image_alt === 'object'
        ? Object.fromEntries(
            Object.entries(body.image_alt)
              .filter(([key]) => typeof key === 'string' && key.trim())
              .map(([key, value]) => [key, typeof value === 'string' ? value.trim() : ''])
              .filter(([, value]) => value)
          )
        : {},
    model_url: typeof body.model_url === 'string' ? body.model_url.trim() || null : body.model_url ?? null,
    base_price: Number.isFinite(Number(body.base_price)) ? Number(body.base_price) : 0,
    is_customizable: body.is_customizable ?? false,
    customization_label:
      typeof body.customization_label === 'string' ? body.customization_label.trim() || null : body.customization_label ?? null,
    is_featured: body.is_featured ?? false,
    is_active: body.is_active ?? true,
    is_archived: body.is_archived ?? false,
    meta_title: typeof body.meta_title === 'string' ? body.meta_title.trim() || null : body.meta_title ?? null,
    meta_description:
      typeof body.meta_description === 'string' ? body.meta_description.trim() || null : body.meta_description ?? null,
    published_at:
      typeof body.published_at === 'string' && body.published_at.trim()
        ? new Date(body.published_at).toISOString()
        : null,
  }
}

function getStockStatus(skus: SkuRow[] | null | undefined) {
  const availableSkus = (skus ?? []).filter((sku) => sku.is_available !== false)
  if (availableSkus.length === 0) return 'No SKUs'
  if (availableSkus.every((sku) => sku.stock_quantity <= 0)) return 'Out of Stock'
  if (availableSkus.some((sku) => sku.stock_quantity <= (sku.low_stock_threshold ?? 5))) return 'Some Low Stock'
  return 'All In Stock'
}

export async function GET(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    const slug = searchParams.get('slug')
    const excludeId = searchParams.get('exclude_id')
    const categoryId = searchParams.get('category_id')
    const isActive = searchParams.get('is_active')
    const status = searchParams.get('status')
    const search = searchParams.get('search')
    const supabase = createAdminSupabaseClient()

    if (slug) {
      let query = supabase.from('shelf_products').select('id').eq('slug', slug).limit(1)
      if (excludeId) query = query.neq('id', excludeId)
      const { data, error } = await query
      if (error) throw new Error(error.message)
      return NextResponse.json({ available: (data ?? []).length === 0 })
    }

    if (id) {
      const { data, error } = await supabase
        .from('shelf_products')
        .select('*, category:shelf_categories(name), shelf_skus(id, stock_quantity, low_stock_threshold, is_available)')
        .eq('id', id)
        .maybeSingle()

      if (error) throw new Error(error.message)
      if (!data) return NextResponse.json({ error: 'Product not found.' }, { status: 404 })

      const product = {
        ...data,
        category_name: data.category?.name ?? null,
        sku_count: data.shelf_skus?.length ?? 0,
        stock_status: getStockStatus(data.shelf_skus),
      }

      return NextResponse.json({ product })
    }

    let query = supabase
      .from('shelf_products')
      .select('*, category:shelf_categories(name), shelf_skus(id, stock_quantity, low_stock_threshold, is_available)')
      .order('created_at', { ascending: false })

    if (categoryId) query = query.eq('category_id', categoryId)
    if (isActive === 'true' || isActive === 'false') query = query.eq('is_active', isActive === 'true')
    if (status === 'archived') {
      query = query.eq('is_archived', true)
    } else if (status === 'draft') {
      query = query.eq('is_archived', false).eq('is_active', false)
    } else if (status === 'active') {
      query = query.eq('is_archived', false).eq('is_active', true)
    } else {
      query = query.eq('is_archived', false)
    }
    if (search) query = query.ilike('name', `%${search}%`)

    const { data, error } = await query
    if (error) throw new Error(error.message)

    const products = (data ?? []).map((product) => ({
      ...product,
      category_name: product.category?.name ?? null,
      sku_count: product.shelf_skus?.length ?? 0,
      stock_status: getStockStatus(product.shelf_skus),
    }))

    return NextResponse.json({ products })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as ProductPayload
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('shelf_products')
      .insert(normalizeProductPayload(body))
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ product: data }, { status: 201 })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as ProductPayload
    if (!body.id) return NextResponse.json({ error: 'Product id is required.' }, { status: 400 })

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('shelf_products')
      .update(normalizeProductPayload(body, true))
      .eq('id', body.id)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ product: data })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) return NextResponse.json({ error: 'Product id is required.' }, { status: 400 })

    const supabase = createAdminSupabaseClient()
    const { error } = await supabase
      .from('shelf_products')
      .update({ is_archived: true, is_active: false })
      .eq('id', id)

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
