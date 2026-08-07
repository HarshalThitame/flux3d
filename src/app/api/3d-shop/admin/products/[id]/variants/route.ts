import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

type VariantPayload = {
  id?: string
  option_name?: string
  option_type?: 'swatch_color' | 'button' | 'dropdown' | 'toggle' | 'text_input'
  values?: string[]
  display_order?: number
  is_required?: boolean
  orders?: { id: string; display_order: number }[]
}

function normalizeVariantPayload(body: VariantPayload, productId: string) {
  const optionName = typeof body.option_name === 'string' ? body.option_name.trim() : ''
  const optionType = body.option_type
  if (!optionName) throw new Error('Option name is required.')
  if (!optionType || !['swatch_color', 'button', 'dropdown', 'toggle', 'text_input'].includes(optionType)) {
    throw new Error('Option type is invalid.')
  }

  return {
    product_id: productId,
    option_name: optionName,
    option_type: optionType,
    values: Array.isArray(body.values) ? body.values.map((value) => String(value).trim()).filter(Boolean) : [],
    display_order: Number.isFinite(Number(body.display_order)) ? Number(body.display_order) : 0,
    is_required: body.is_required ?? true,
  }
}

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await context.params
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('shelf_variant_options')
      .select('*')
      .eq('product_id', id)
      .order('display_order', { ascending: true })
      .order('created_at', { ascending: true })

    if (error) throw new Error(error.message)
    return NextResponse.json({ variants: data ?? [] })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await context.params
    const body = (await request.json()) as VariantPayload
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('shelf_variant_options')
      .insert({ ...normalizeVariantPayload(body, id), ...(typeof body.id === 'string' ? { id: body.id } : {}) })
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ variant: data }, { status: 201 })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await context.params
    const body = (await request.json()) as VariantPayload
    const supabase = createAdminSupabaseClient()

    if (Array.isArray(body.orders)) {
      await Promise.all(
        body.orders.map(async (item) => {
          const { error } = await supabase
            .from('shelf_variant_options')
            .update({ display_order: item.display_order })
            .eq('product_id', id)
            .eq('id', item.id)
          if (error) throw new Error(error.message)
        })
      )
      return NextResponse.json({ ok: true })
    }

    if (!body.id) return NextResponse.json({ error: 'Variant option id is required.' }, { status: 400 })

    const { data, error } = await supabase
      .from('shelf_variant_options')
      .update(normalizeVariantPayload(body, id))
      .eq('product_id', id)
      .eq('id', body.id)
      .select('*')
      .single()

    if (error) throw new Error(error.message)
    return NextResponse.json({ variant: data })
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
    const variantId = searchParams.get('id')
    if (!variantId) return NextResponse.json({ error: 'Variant option id is required.' }, { status: 400 })

    const supabase = createAdminSupabaseClient()
    const { error } = await supabase
      .from('shelf_variant_options')
      .delete()
      .eq('product_id', id)
      .eq('id', variantId)

    if (error) throw new Error(error.message)
    return NextResponse.json({ ok: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
