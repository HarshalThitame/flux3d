import { NextResponse } from 'next/server'
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/supabase/config'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: 'Missing material id' },
        { status: 400 }
      )
    }

    const supabase = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey())

    const { data, error } = await supabase
      .from('materials')
      .update({
        name: body.name,
        icon: body.icon,
        summary: body.summary,
        density: body.density,
        price_per_gram: body.price_per_gram,
        machine_rate: body.machine_rate,
        multiplier: body.multiplier,
        recommended_for: body.recommended_for,
        properties: body.properties,
        colors: body.colors,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update material' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json(
        { error: 'Missing material id' },
        { status: 400 }
      )
    }

    const supabase = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey())

    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete material' },
      { status: 500 }
    )
  }
}
