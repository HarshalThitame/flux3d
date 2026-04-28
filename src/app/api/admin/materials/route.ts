import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import {
  createAdminMaterial,
  getAdminMaterialsData,
  updateAdminMaterial,
} from '@/lib/admin/queries'
import { requireAdminRequest } from '@/lib/admin/request'

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
  pricePerGram?: number
  density?: number
  colors?: string[]
  stock?: 'Healthy' | 'Low' | 'Paused'
}

function validateMaterialPayload(body: MaterialPayload) {
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const pricePerGram = Number(body.pricePerGram)
  const density = Number(body.density)
  const colors = Array.isArray(body.colors)
    ? body.colors.map((color) => String(color).trim()).filter(Boolean)
    : []
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
    pricePerGram,
    density,
    colors,
    stock,
  } as const
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as MaterialPayload
    const material = await createAdminMaterial(validateMaterialPayload(body))
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

    const material = await updateAdminMaterial(body.id, validateMaterialPayload(body))
    return NextResponse.json({ material })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
