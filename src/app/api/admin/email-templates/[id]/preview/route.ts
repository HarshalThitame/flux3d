import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { getTemplateById, renderDbTemplate } from '@/lib/email/db-templates'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/email-templates/[id]/preview
 *
 * Body: { variables: Record<string, string> }
 *
 * Returns: { html: string, missingVariables: string[] }
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const { id } = await params
    const body = await req.json()
    const variables: Record<string, string> = body.variables ?? {}

    const template = await getTemplateById(id)
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    const { html, missingVariables } = await renderDbTemplate(template, variables)

    return NextResponse.json({ html, missingVariables })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
