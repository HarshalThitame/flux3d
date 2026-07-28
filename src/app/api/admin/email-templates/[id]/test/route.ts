import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'
import { getTemplateById, renderDbTemplate } from '@/lib/email/db-templates'
import { getResendClient, getSenderAddress } from '@/lib/email/resend-client'
import type { EmailLogRow } from 'types/database'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

/**
 * POST /api/admin/email-templates/[id]/test
 *
 * Body: { recipient: string, variables?: Record<string, string> }
 *
 * Sends a real email using the DB template + Resend.
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
    const recipient = String(body.recipient ?? '').trim()
    const variables: Record<string, string> = body.variables ?? {}

    if (!recipient) {
      return NextResponse.json(
        { error: 'Missing required field: recipient' },
        { status: 400 }
      )
    }

    const template = await getTemplateById(id)
    if (!template) {
      return NextResponse.json({ error: 'Template not found' }, { status: 404 })
    }

    // Render
    const { html, missingVariables } = await renderDbTemplate(template, variables)
    const subject = template.subject

    // Insert log
    const supabase = createAdminClient()
    const { data: log, error: logError } = await supabase
      .from('email_logs')
      .insert({
        recipient,
        email_type: template.email_type,
        subject,
        template_name: template.name,
        status: 'queued',
        template_id: template.id,
        variables_used: variables,
        queued_at: new Date().toISOString(),
      })
      .select()
      .single()

    if (logError || !log) {
      console.error('[admin/email-templates/test] Log insert error:', logError)
      return NextResponse.json(
        { error: logError?.message ?? 'Failed to create email log' },
        { status: 500 }
      )
    }

    const logRow = log as EmailLogRow

    // Send via Resend
    const resend = await getResendClient()
    const sender = await getSenderAddress()
    const from = `"${sender.name}" <${sender.email}>`

    const { data: sendData, error: sendError } = await resend.emails.send({
      from,
      to: recipient,
      subject,
      html,
      tags: [
        { name: 'email_type', value: template.email_type },
        { name: 'template_id', value: template.id },
        { name: 'test_send', value: 'true' },
      ],
    })

    if (sendError || !sendData?.id) {
      const errMsg = sendError?.message ?? 'Resend returned no message id'
      await supabase
        .from('email_logs')
        .update({
          status: 'failed',
          failed_at: new Date().toISOString(),
          error_message: errMsg,
        })
        .eq('id', logRow.id)

      return NextResponse.json({ error: errMsg }, { status: 500 })
    }

    // Mark sent
    await supabase
      .from('email_logs')
      .update({
        status: 'sent',
        provider_message_id: sendData.id,
        resend_id: sendData.id,
        sent_at: new Date().toISOString(),
      })
      .eq('id', logRow.id)

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'test_email_template',
      target_type: 'setting',
      target_id: template.id,
      old_value: null,
      new_value: { recipient, template_id: template.id, log_id: logRow.id },
    })

    return NextResponse.json({
      success: true,
      messageId: sendData.id,
      logId: logRow.id,
      missingVariables,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
