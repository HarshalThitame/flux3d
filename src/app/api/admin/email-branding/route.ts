import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'
import type { EmailBrandingRow } from 'types/database'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * GET /api/admin/email-branding
 */
export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('email_branding')
      .select('*')
      .eq('id', 'default')
      .maybeSingle()

    return NextResponse.json({ data: data as EmailBrandingRow | null })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

/**
 * PUT /api/admin/email-branding
 *
 * Body: Partial<EmailBrandingRow>
 */
export async function PUT(req: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = await req.json()
    const supabase = createAdminClient()

    const { data: existing } = await supabase
      .from('email_branding')
      .select('*')
      .eq('id', 'default')
      .maybeSingle()

    const update: Partial<EmailBrandingRow> = { id: 'default' }

    const stringFields = [
      'logo_url',
      'company_name',
      'address',
      'gst_number',
      'support_email',
      'support_phone',
      'primary_color',
      'secondary_color',
      'accent_color',
      'footer_text',
      'dark_mode_css',
      'header_html',
      'footer_html',
    ] as const

    for (const key of stringFields) {
      if (key in body) {
        ;(update as any)[key] = body[key] ? String(body[key]).trim() : null
      }
    }

    if ('social_icons' in body) {
      update.social_icons =
        typeof body.social_icons === 'object' && body.social_icons !== null
          ? body.social_icons
          : {}
    }

    const { data, error } = await supabase
      .from('email_branding')
      .upsert(update)
      .select()
      .single()

    if (error || !data) {
      console.error('[admin/email-branding] Upsert error:', error)
      return NextResponse.json(
        { error: error?.message ?? 'Update failed' },
        { status: 500 }
      )
    }

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'update_email_branding',
      target_type: 'setting',
      target_id: 'default',
      old_value: (existing as EmailBrandingRow | null)
        ? (existing as EmailBrandingRow)
        : {},
      new_value: data as EmailBrandingRow,
    })

    return NextResponse.json({ data: data as EmailBrandingRow })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
