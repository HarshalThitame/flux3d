import { NextResponse } from 'next/server'
import { getPublicSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const settings = await getPublicSettings()
    return NextResponse.json({ settings })
  } catch {
    return NextResponse.json({ settings: null }, { status: 200 })
  }
}
