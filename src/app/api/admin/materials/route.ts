import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import {
  createAdminMaterial,
  deleteAdminMaterial,
  getAdminMaterialsData,
  updateAdminMaterial,
} from '@/lib/admin/queries'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { logAdminAction } from '@/lib/admin/auditLog'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const data = await getAdminMaterialsData()
    return NextResponse.json({ materials: data })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

type MaterialPayload = {
  id?: string
  name?: string
  icon?: string
  summary?: string
  density?: number
  pricePerGram?: number
  machineRate?: number
  multiplier?: number
  recommendedFor?: string
  properties?: Record<string, unknown>
  colors?: string[]
  difficultyFactor?: number
  keyProperties?: string[]
  bestFor?: string[]
  difficultyLevel?: 'Easy' | 'Medium' | 'Hard'
  heatResistance?: 'Low' | 'Medium' | 'High'
  strengthRating?: 'Low' | 'Medium' | 'High'
  finishQuality?: 'Basic' | 'Good' | 'Excellent'
  samplePhoto?: string
  stock?: 'Healthy' | 'Low' | 'Paused'
}

export function validateMaterialPayload(body: MaterialPayload) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const icon = typeof body.icon === 'string' && body.icon.trim() ? body.icon.trim() : '🧩'
  const summary = typeof body.summary === 'string' ? body.summary.trim() : ''
  const pricePerGram = Number(body.pricePerGram)
  const density = Number(body.density)
  const machineRate = Number(body.machineRate) || 180
  const multiplier = Number(body.multiplier) || 1
  const colors = Array.isArray(body.colors)
    ? body.colors.map((color) => String(color).trim()).filter(Boolean)
    : []
  const difficultyFactor = Number(body.difficultyFactor) || 1.1
  const recommendedFor = typeof body.recommendedFor === 'string' ? body.recommendedFor.trim() : ''
  const properties = body.properties && typeof body.properties === 'object' ? body.properties : {}
  const keyProperties = Array.isArray(body.keyProperties)
    ? body.keyProperties.map((value) => String(value).trim()).filter(Boolean)
    : []
  const bestFor = Array.isArray(body.bestFor)
    ? body.bestFor.map((value) => String(value).trim()).filter(Boolean)
    : []
  const difficultyLevel = body.difficultyLevel ?? 'Easy'
  const heatResistance = body.heatResistance ?? 'Low'
  const strengthRating = body.strengthRating ?? 'Medium'
  const finishQuality = body.finishQuality ?? 'Good'
  const samplePhoto = typeof body.samplePhoto === 'string' ? body.samplePhoto.trim() : ''
  const stock = body.stock

  if (!name) {
    throw new Error('Material name is required.')
  }

  if (!Number.isFinite(pricePerGram) || pricePerGram < 0) {
    throw new Error('Price per gram must be a valid number.')
  }

  if (!Number.isFinite(density) || density < 0) {
    throw new Error('Density must be a valid number.')
  }

  if (!stock || !['Healthy', 'Low', 'Paused'].includes(stock)) {
    throw new Error('Stock state is invalid.')
  }

  return {
    name,
    icon,
    summary,
    pricePerGram,
    density,
    machineRate,
    multiplier,
    recommendedFor,
    properties,
    colors,
    difficultyFactor,
    keyProperties,
    bestFor,
    difficultyLevel,
    heatResistance,
    strengthRating,
    finishQuality,
    samplePhoto,
    stock,
  } as const
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as MaterialPayload
    const material = await createAdminMaterial(validateMaterialPayload(body))
    await logAdminAction({
      admin_id: auth.user.id,
      action: 'create_material',
      target_type: 'material',
      target_id: material.id,
      old_value: null,
      new_value: material as Record<string, unknown>,
    })
    return NextResponse.json({ material }, { status: 201 })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as MaterialPayload

    if (!body.id) {
      return NextResponse.json({ error: 'Material id is required.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data: oldMaterial } = await supabase
      .from('materials')
      .select('id, name, density, price_per_gram, machine_rate, multiplier, stock')
      .eq('id', body.id)
      .maybeSingle()
    const material = await updateAdminMaterial(body.id, validateMaterialPayload(body))
    await logAdminAction({
      admin_id: auth.user.id,
      action: 'update_material',
      target_type: 'material',
      target_id: body.id,
      old_value: oldMaterial ?? null,
      new_value: material as Record<string, unknown>,
    })
    return NextResponse.json({ material })
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

    if (!id) {
      return NextResponse.json({ error: 'Material id is required.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const { data: oldMaterial } = await supabase
      .from('materials')
      .select('id, name')
      .eq('id', id)
      .maybeSingle()

    const deleted = await deleteAdminMaterial(id)

    if (!deleted) {
      return NextResponse.json({ error: 'Material not found.' }, { status: 404 })
    }

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'delete_material',
      target_type: 'material',
      target_id: id,
      old_value: oldMaterial ?? null,
      new_value: null,
    })
    return NextResponse.json({ success: true, id })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
