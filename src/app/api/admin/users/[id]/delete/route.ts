import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { logAdminAction } from '@/lib/admin/auditLog'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminPermission('admin.users')
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    const supabase = createAdminSupabaseClient()

    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name')
      .eq('id', id)
      .single()

    await supabase.rpc('delete_user_data', { p_user_id: id })

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'delete_user_data',
      target_type: 'user',
      target_id: id,
      new_value: { deleted: true, email: profile?.email ?? '' },
    })

    return NextResponse.json({ success: true, email: profile?.email ?? null })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
