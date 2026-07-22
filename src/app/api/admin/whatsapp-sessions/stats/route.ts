import { NextResponse } from 'next/server'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET() {
  try {
    const supabase = createAdminSupabaseClient()

    const { count: totalSessions } = await supabase
      .from('whatsapp_sessions')
      .select('*', { count: 'exact', head: true })

    const { count: active24h } = await supabase
      .from('whatsapp_sessions')
      .select('*', { count: 'exact', head: true })
      .gt('last_active', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    const { count: staleCount } = await supabase
      .from('whatsapp_sessions')
      .select('*', { count: 'exact', head: true })
      .lt('last_active', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString())

    return NextResponse.json({
      totalSessions: totalSessions ?? 0,
      active24h: active24h ?? 0,
      staleCount: staleCount ?? 0,
    })
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    )
  }
}
