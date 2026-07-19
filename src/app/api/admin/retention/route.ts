import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

type TableInfo = {
  table: string
  dateColumn: string
}

const TABLES: TableInfo[] = [
  { table: 'error_logs', dateColumn: 'occurred_at' },
  { table: 'page_visits', dateColumn: 'visited_at' },
  { table: 'user_sessions', dateColumn: 'started_at' },
  { table: 'search_logs', dateColumn: 'searched_at' },
  { table: 'feature_usage', dateColumn: 'used_at' },
]

export async function GET() {
  const auth = await requireAdminPermission('audit.view')
  if ('response' in auth) return auth.response

  try {
    const supabase = createAdminSupabaseClient()
    const stats: Array<{ table: string; oldest: string | null; newest: string | null; count: number }> = []

    for (const { table, dateColumn } of TABLES) {
      const { count } = await supabase.from(table).select('*', { count: 'exact', head: true })
      const { data: oldestRow } = await supabase.from(table).select(dateColumn).order(dateColumn, { ascending: true }).limit(1).maybeSingle()
      const { data: newestRow } = await supabase.from(table).select(dateColumn).order(dateColumn, { ascending: false }).limit(1).maybeSingle()

      stats.push({
        table,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        oldest: (oldestRow as any)?.[dateColumn] ?? null,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        newest: (newestRow as any)?.[dateColumn] ?? null,
        count: count ?? 0,
      })
    }

    return NextResponse.json({ tables: stats })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function POST(request: Request) {
  const auth = await requireAdminPermission('audit.view')
  if ('response' in auth) return auth.response

  try {
    const body = await request.json().catch(() => ({})) as { days?: number }
    const days = Math.max(30, Math.min(365, Number(body.days) || 90))

    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase.rpc('purge_old_records', { retention_days: days })

    if (error) throw new Error(error.message)

    return NextResponse.json({ purged: data ?? [], days })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
