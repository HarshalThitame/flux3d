import { NextResponse } from 'next/server'
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/supabase/config'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const supabase = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey())

    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('created_at', { ascending: true })

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    const materials = (data || []).map((row) => ({
      id: row.id,
      name: row.name,
      icon: row.icon || '🧩',
      summary: row.summary || '',
      density: row.density || 1.24,
      pricePerGram: row.price_per_gram || 2.8,
      machineRate: row.machine_rate || 180,
      multiplier: row.multiplier || 1,
      recommendedFor: row.recommended_for || '',
      properties: row.properties || {},
      colors: row.colors || [],
    }))

    return NextResponse.json(materials)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const supabase = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey())
    const body = await request.json()

    const { data, error } = await supabase
      .from('materials')
      .insert([
        {
          id: body.id,
          name: body.name,
          icon: body.icon,
          summary: body.summary,
          density: body.density,
          price_per_gram: body.pricePerGram,
          machine_rate: body.machineRate,
          multiplier: body.multiplier,
          recommended_for: body.recommendedFor,
          properties: body.properties,
          colors: body.colors,
        },
      ])
      .select()
      .single()

    if (error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      )
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create material' },
      { status: 500 }
    )
  }
}
