import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminPermission('audit.view')
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    const supabase = createAdminSupabaseClient()

    const { data: quoteVersions } = await supabase
      .from('quote_versions')
      .select('id')
      .eq('quote_id', id)
      .order('version_number', { ascending: false })

    if (!quoteVersions || quoteVersions.length === 0) {
      return NextResponse.json({ events: [] })
    }

    const versionIds = quoteVersions.map((qv) => qv.id)

    const { data: events, error } = await supabase
      .from('quote_version_events')
      .select('*')
      .in('quote_version_id', versionIds)
      .order('occurred_at', { ascending: false })

    if (error) throw new Error(error.message)

    return NextResponse.json({ events: events ?? [] })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
