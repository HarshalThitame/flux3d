import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import type { EmailTemplateVersionRow } from 'types/database'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/email-templates/[id]/versions
 *
 * Returns all versions for a template, newest first.
 * Query params:
 *   page  — default 1
 *   limit — default 25, max 100
 */
export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    const { searchParams } = new URL(req.url)
    const page = Math.max(1, Number(searchParams.get('page') ?? '1'))
    const limit = Math.min(100, Math.max(1, Number(searchParams.get('limit') ?? '25')))

    const supabase = createAdminClient()

    // Verify template exists
    const { data: template } = await supabase
      .from('email_templates')
      .select('id')
      .eq('id', id)
      .maybeSingle()

    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    let query = supabase
      .from('email_template_versions')
      .select('*', { count: 'exact' })
      .eq('template_id', id)
      .order('version_number', { ascending: false })

    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) {
      console.error('[admin/email-templates/versions] Query error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      data: (data ?? []) as EmailTemplateVersionRow[],
      total: count ?? 0,
      page,
      limit,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
