import { NextResponse } from 'next/server'
import { getPublicSettings } from '@/lib/settings'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const settings = await getPublicSettings()
    return NextResponse.json({ settings })
  } catch (error) {
    console.error('[public/settings] Failed to load settings:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to load public settings' },
      { status: 500 }
    )
  }
}
