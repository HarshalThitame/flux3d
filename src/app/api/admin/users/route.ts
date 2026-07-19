import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { logAdminAction } from '@/lib/admin/auditLog'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdminPermission('admin.users')
  if ('response' in auth) return auth.response

  try {
    const supabase = createAdminSupabaseClient()
    const { data, error } = await supabase
      .from('profiles')
      .select('id, email, full_name, is_admin, is_finance, is_order_manager, is_printer_manager, is_qc_manager, created_at')
      .order('created_at', { ascending: false })

    if (error) throw new Error(error.message)

    return NextResponse.json({ users: data ?? [] })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminPermission('admin.users')
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as {
      user_id?: string
      is_admin?: boolean
      is_finance?: boolean
      is_order_manager?: boolean
      is_printer_manager?: boolean
      is_qc_manager?: boolean
    }

    if (!body.user_id) {
      return NextResponse.json({ error: 'User ID is required.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const updates: Record<string, boolean> = {}

    if (typeof body.is_admin === 'boolean') updates.is_admin = body.is_admin
    if (typeof body.is_finance === 'boolean') updates.is_finance = body.is_finance
    if (typeof body.is_order_manager === 'boolean') updates.is_order_manager = body.is_order_manager
    if (typeof body.is_printer_manager === 'boolean') updates.is_printer_manager = body.is_printer_manager
    if (typeof body.is_qc_manager === 'boolean') updates.is_qc_manager = body.is_qc_manager

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No valid role fields provided.' }, { status: 400 })
    }

    const { data: oldProfile } = await supabase
      .from('profiles')
      .select('is_admin, is_finance, is_order_manager, is_printer_manager, is_qc_manager')
      .eq('id', body.user_id)
      .single()

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', body.user_id)

    if (error) throw new Error(error.message)

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'update_user_roles',
      target_type: 'admin_user',
      target_id: body.user_id,
      old_value: oldProfile,
      new_value: updates,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
