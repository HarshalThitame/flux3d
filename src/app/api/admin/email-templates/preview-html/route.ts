import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { renderHtmlPreview } from '@/lib/email/db-templates'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/email-templates/preview-html
 *
 * Body: { html_body: string, variables?: Record<string, string> }
 *
 * Returns the fully rendered HTML (template-engine + branded wrapper)
 * without requiring a template row in the database.
 */
export async function POST(req: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = await req.json()
    const htmlBody = String(body.html_body ?? '')
    const variables =
      typeof body.variables === 'object' && body.variables !== null
        ? (body.variables as Record<string, string | number | boolean | undefined | null>)
        : {}

    if (!htmlBody.trim()) {
      return NextResponse.json({ error: 'html_body is required' }, { status: 400 })
    }

    const html = await renderHtmlPreview(htmlBody, variables)
    return NextResponse.json({ html })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
