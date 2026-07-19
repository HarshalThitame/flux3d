import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const auth = await requireAdminPermission('audit.view')
  if ('response' in auth) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const targetType = searchParams.get('target_type')
    const action = searchParams.get('action')
    const adminId = searchParams.get('admin_id')
    const page = Math.max(1, Number(searchParams.get('page')) || 1)
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit')) || 50))
    const from = (page - 1) * limit
    const to = from + limit - 1

    const supabase = createAdminSupabaseClient()
    let query = supabase
      .from('admin_audit_logs')
      .select('id, admin_id, action, target_type, target_id, old_value, new_value, performed_at', { count: 'exact' })
      .order('performed_at', { ascending: false })
      .range(from, to)

    if (targetType) query = query.eq('target_type', targetType)
    if (action) query = query.ilike('action', `%${action}%`)
    if (adminId) query = query.eq('admin_id', adminId)

    const { data, error, count } = await query
    if (error) throw new Error(error.message)

    return NextResponse.json({
      logs: data ?? [],
      page,
      limit,
      total: count ?? 0,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
