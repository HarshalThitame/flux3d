import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { parseDimensionsJson, withComputedVolume } from '@/lib/shop/dimensions'
import type { ProductDimensions } from '@/lib/shop/admin-types'

type DimensionEntry = {
  option_name: string
  option_value: string
  dimensions: ProductDimensions
  box_dimensions?: ProductDimensions | null
}

function normalizeEntry(entry: Partial<DimensionEntry> & { id?: string }) {
  const optionName = typeof entry.option_name === 'string' ? entry.option_name.trim() : ''
  const optionValue = typeof entry.option_value === 'string' ? entry.option_value.trim() : ''
  if (!optionName || !optionValue) throw new Error('option_name and option_value are required.')
  const parsed = parseDimensionsJson(entry.dimensions)
  if (!parsed) throw new Error(`Invalid dimensions for "${optionName}: ${optionValue}".`)
  const normalized = {
    option_name: optionName,
    option_value: optionValue,
    dimensions: withComputedVolume(parsed),
    ...(typeof entry.id === 'string' && entry.id ? { id: entry.id } : {}),
  }
  if (Object.prototype.hasOwnProperty.call(entry, 'box_dimensions')) {
    const parsedBox = parseDimensionsJson(entry.box_dimensions)
    return { ...normalized, box_dimensions: parsedBox ? withComputedVolume(parsedBox) : null }
  }
  return normalized
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await context.params
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('shelf_variant_option_dimensions')
      .select('*')
      .eq('product_id', id)

    if (error) throw new Error(error.message)
    return NextResponse.json({ dimensions: data ?? [] })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await context.params
    const body = (await request.json()) as { dimensions?: DimensionEntry[] }
    const entries = Array.isArray(body.dimensions) ? body.dimensions : []
    if (entries.length === 0) {
      return NextResponse.json({ error: 'At least one dimension entry is required.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    for (const entry of entries) {
      const normalized = normalizeEntry(entry)
      const { error } = await supabase
        .from('shelf_variant_option_dimensions')
        .upsert(
          {
            product_id: id,
            option_name: normalized.option_name,
            option_value: normalized.option_value,
            dimensions: normalized.dimensions,
            ...('box_dimensions' in normalized ? { box_dimensions: normalized.box_dimensions } : {}),
          },
          { onConflict: 'product_id,option_name,option_value' }
        )
      if (error) throw new Error(error.message)
    }

    const { data: dimensions, error: listError } = await supabase
      .from('shelf_variant_option_dimensions')
      .select('*')
      .eq('product_id', id)
    if (listError) throw new Error(listError.message)

    return NextResponse.json({ dimensions: dimensions ?? [], saved: entries.length }, { status: 201 })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await context.params
    const { searchParams } = new URL(request.url)
    const ids = searchParams.getAll('id')
    if (ids.length === 0) {
      return NextResponse.json({ error: 'At least one dimension id is required.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { error } = await supabase
      .from('shelf_variant_option_dimensions')
      .delete()
      .eq('product_id', id)
      .in('id', ids)

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}