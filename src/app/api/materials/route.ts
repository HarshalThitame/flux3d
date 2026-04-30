import { getPublicMaterialSpecs } from '@/lib/public-materials'
import { NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const materials = await getPublicMaterialSpecs()
    return NextResponse.json({ materials })
  } catch (error) {
    console.error('API /api/materials error:', error)
    return NextResponse.json(
      { error: 'Failed to load materials' },
      { status: 500 }
    )
  }
}
