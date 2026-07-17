import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, isCurrentUserAdmin } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

const PUBLIC_CACHE_HEADERS = {
  'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=3600',
}

type MaterialRow = {
  id: string
  name: string
  icon?: string | null
  summary?: string | null
  density?: number | null
  price_per_gram?: number | null
  machine_rate?: number | null
  multiplier?: number | null
  recommended_for?: string | null
  properties?: {
    strength?: string
    flexibility?: string
    tempResistance?: string
    difficulty?: string
  } | null
  colors?: unknown[] | null
  difficulty_factor?: number | null
  key_properties?: string[] | null
  best_for?: string[] | null
  difficulty_level?: string | null
  heat_resistance?: string | null
  strength_rating?: string | null
  finish_quality?: string | null
  sample_photo?: string | null
}

async function isAdminUser(): Promise<boolean> {
  try {
    return await isCurrentUserAdmin()
  } catch {
    return false
  }
}

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient()

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

    const materials = ((data || []) as MaterialRow[]).map((row) => {
      const rawProps = row.properties || {}
      const properties = {
        strength: rawProps.strength || 'Medium',
        flexibility: rawProps.flexibility || 'Medium',
        tempResistance: rawProps.tempResistance || 'Medium',
        difficulty: rawProps.difficulty || 'Medium',
      }

      return {
        id: row.id,
        name: row.name,
        icon: row.icon ?? '🧩',
        summary: row.summary ?? '',
        density: row.density ?? 1.24,
        pricePerGram: row.price_per_gram ?? 2.8,
        machineRate: row.machine_rate ?? 180,
        multiplier: row.multiplier ?? 1,
        recommendedFor: row.recommended_for ?? '',
        properties,
        colors: row.colors ?? [],
        difficultyFactor: row.difficulty_factor ?? 1.1,
        keyProperties: row.key_properties ?? [],
        bestFor: row.best_for ?? [],
        difficultyLevel: row.difficulty_level ?? 'Easy',
        heatResistance: row.heat_resistance ?? 'Low',
        strengthRating: row.strength_rating ?? 'Medium',
        finishQuality: row.finish_quality ?? 'Good',
        samplePhoto: row.sample_photo ?? '',
      }
    })

    return NextResponse.json({ materials }, { headers: PUBLIC_CACHE_HEADERS })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch materials' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const supabase = createAdminSupabaseClient()
    const body = await request.json()

    const { data, error } = await supabase
      .from('materials')
      .insert([
        {
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
          difficulty_factor: body.difficulty_factor ?? 1.1,
          key_properties: body.key_properties,
          best_for: body.best_for,
          difficulty_level: body.difficulty_level,
          heat_resistance: body.heat_resistance,
          strength_rating: body.strength_rating,
          finish_quality: body.finish_quality,
          sample_photo: body.sample_photo,
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

export async function PUT(request: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const supabase = createAdminSupabaseClient()
    const body = await request.json()

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
        difficulty_factor: body.difficulty_factor ?? 1.1,
        key_properties: body.key_properties,
        best_for: body.best_for,
        difficulty_level: body.difficulty_level,
        heat_resistance: body.heat_resistance,
        strength_rating: body.strength_rating,
        finish_quality: body.finish_quality,
        sample_photo: body.sample_photo,
      })
      .eq('id', body.id)
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

export async function DELETE(request: Request) {
  if (!(await isAdminUser())) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json(
        { error: 'Missing material id' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

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
