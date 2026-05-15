import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { getAdminUsersData } from '@/lib/admin/queries'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import type { AdminCustomerStatus } from '@/lib/admin/types'
import { logAdminAction } from '@/lib/admin/auditLog'

export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const data = await getAdminUsersData()
    return NextResponse.json({ users: data })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = (await request.json()) as {
      userId?: string
      status?: AdminCustomerStatus
      notes?: string
      manualCoupon?: string
      manualCredit?: number
    }

    if (!body.userId) {
      return NextResponse.json({ error: 'User id is required.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const currentUser = await supabase.auth.admin.getUserById(body.userId)
    if (currentUser.error) throw new Error(currentUser.error.message)
    if (!currentUser.data.user) {
      return NextResponse.json({ error: 'Customer not found.' }, { status: 404 })
    }

    const updates: Parameters<typeof supabase.auth.admin.updateUserById>[1] = {}
    const oldValue = {
      banned_until: currentUser.data.user.banned_until,
      app_metadata: currentUser.data.user.app_metadata,
    }

    if (body.status === 'Suspended') {
      updates.ban_duration = '876000h'
    } else if (body.status === 'Active') {
      updates.ban_duration = 'none'
    }

    if ('notes' in body || 'manualCoupon' in body || 'manualCredit' in body) {
      updates.app_metadata = {
        ...currentUser.data.user.app_metadata,
        admin_notes: body.notes ?? currentUser.data.user.app_metadata.admin_notes ?? '',
        manual_coupon: body.manualCoupon ?? currentUser.data.user.app_metadata.manual_coupon ?? '',
        manual_credit: Number(body.manualCredit ?? currentUser.data.user.app_metadata.manual_credit ?? 0),
      }
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json({ error: 'No supported update provided.' }, { status: 400 })
    }

    const { error } = await supabase.auth.admin.updateUserById(body.userId, updates)
    if (error) throw new Error(error.message)

    if (typeof body.notes === 'string' && body.notes.trim()) {
      const { error: noteError } = await supabase.from('admin_customer_notes').insert({
        user_id: body.userId,
        admin_id: auth.user.id,
        note: body.notes.trim(),
      })
      if (noteError) throw new Error(noteError.message)
    }

    await logAdminAction({
      admin_id: auth.user.id,
      action: body.status === 'Suspended' ? 'suspend_user' : body.status === 'Active' ? 'reactivate_user' : 'update_user_metadata',
      target_type: 'user',
      target_id: body.userId,
      old_value: oldValue,
      new_value: updates as Record<string, unknown>,
    })

    const users = await getAdminUsersData()
    const user = users.find((item) => item.id === body.userId)
    return NextResponse.json({ user })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
