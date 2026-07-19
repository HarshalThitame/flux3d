import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminPermission } from '@/lib/admin/permissions'
import { approveQuoteVersion } from '@/lib/quote/approval'
import { logAdminAction } from '@/lib/admin/auditLog'

export const dynamic = 'force-dynamic'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminPermission('quotes.approve')
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    await approveQuoteVersion(id, auth.user.id)

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'approve_quote',
      target_type: 'quote',
      target_id: id,
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
