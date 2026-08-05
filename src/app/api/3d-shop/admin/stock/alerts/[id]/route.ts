import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

export const dynamic = 'force-dynamic'

type PatchBody = {
  action: 'acknowledge' | 'resolve'
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await context.params
    const body = (await request.json()) as PatchBody

    if (!['acknowledge', 'resolve'].includes(body.action)) {
      return NextResponse.json({ error: 'Action must be acknowledge or resolve.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()

    const updates =
      body.action === 'acknowledge'
        ? { status: 'acknowledged', acknowledged_at: new Date().toISOString() }
        : { status: 'resolved', resolved_at: new Date().toISOString() }

    const { data, error } = await supabase
      .from('stock_alerts')
      .update(updates)
      .eq('id', id)
      .select('id, status')
      .single()

    if (error) throw new Error(error.message)

    return NextResponse.json({ alert: data })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
