import { NextResponse } from 'next/server'
import { getShopHomeData } from '@/lib/shop/public-data'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    return NextResponse.json(await getShopHomeData())
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load 3D Shop home data.' },
      { status: 500 }
    )
  }
}
