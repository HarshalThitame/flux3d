import { NextResponse } from 'next/server'
import { createAdminSupabaseClient, isCurrentUserAdmin } from '@/lib/admin/server'
import { reportError } from '@/lib/error-handling'
import { getCurrentUserProfile } from '@/lib/auth/server'

export const dynamic = 'force-dynamic'

export async function PATCH(
  request: Request,
  props: { params: Promise<{ reviewId: string }> }
) {
  try {
    const auth = await getCurrentUserProfile()
    if (!auth?.profile.isAdmin) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { reviewId } = await props.params
    const body = await request.json()
    const { status, featured } = body

    const updateData: any = {
      moderated_by: auth.user.id,
      moderated_at: new Date().toISOString()
    }

    if (status !== undefined) updateData.status = status
    if (featured !== undefined) updateData.featured = featured

    const supabase = createAdminSupabaseClient()
    const { error } = await supabase
      .from('reviews')
      .update(updateData)
      .eq('id', reviewId)

    if (error) throw new Error(error.message)

    return NextResponse.json({ success: true })
  } catch (error) {
    reportError(error, 'Failed to update review')
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
