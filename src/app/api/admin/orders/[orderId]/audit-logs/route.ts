import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ orderId: string }> }
) {
  const auth = await requireAdminPermission('audit.view')
  if ('response' in auth) return auth.response

  try {
    const { orderId } = await params
    const supabase = createAdminSupabaseClient()

    const { data, error } = await supabase
      .from('admin_audit_logs')
      .select(`
        id,
        action,
        target_type,
        old_value,
        new_value,
        performed_at,
        admin:admin_id ( id )
      `)
      .or(`target_id.eq.${orderId},target_id.eq.${orderId}`)
      .eq('target_type', 'order')
      .order('performed_at', { ascending: false })
      .limit(50)

    if (error) throw new Error(error.message)

    return NextResponse.json({ logs: data ?? [] })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
