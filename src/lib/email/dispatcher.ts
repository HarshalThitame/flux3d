import { createAdminClient } from '@/lib/supabase/admin'
import { getResendClient, getSenderAddress } from './resend-client'
import { getTemplateByType, renderDbTemplate } from './db-templates'
import { getEmailSettings, isMaintenanceModeBlocking } from './settings-cache'
import { logEmailEvent } from './logEmailEvent'
import {
  renderOrderItemsHtml,
  renderShippedItemsHtml,
  renderPricingHtml,
  renderPaymentHtml,
  renderShippingAddressHtml,
  renderIssuesHtml,
} from './payload-renderer'
import { extractAttachments, stripAttachmentPlaceholders } from './template-engine'
import { fetchAttachmentBase64 } from './attachments'
import type { EmailJobPayload, DispatchResult } from './types'
import type { EmailLogRow } from '../../../types/database'

/**
 * Core email dispatcher.
 *
 * Flow:
 *   1. Load email log from DB (inserted by producer as 'queued')
 *   2. Load DB template (email_templates where is_enabled=true)
 *      → render with template-engine + branded wrapper
 *   3. Resolve {{attachment:filename}} placeholders from storage
 *   4. Send via Resend API
 *   5. Update log: status='sent', provider_message_id, sent_at, template_id, variables_used
 *   6. On any error: update log: status='failed', error_message
 *
 * Edge cases:
 *   - If the log row is missing (DB inconsistency), we still attempt to send
 *     but log a warning. This prevents emails from being lost due to DB issues.
 *   - If Resend returns a 4xx, we do NOT retry (invalid email, blocked, etc.).
 *     The log is marked 'failed' permanently.
 *   - If Resend returns a 5xx, QStash will retry automatically. We update the
 *     log on each attempt so admins can see retry count.
 */

export async function dispatchEmail(
  payload: EmailJobPayload,
  logId?: string
): Promise<DispatchResult> {
  const supabase = createAdminClient()

  // Step 1: Resolve or create the log row
  let log: EmailLogRow | null = null
  if (logId) {
    const { data } = await supabase.from('email_logs').select('*').eq('id', logId).single()
    log = data as EmailLogRow | null
  }

  if (!log) {
    // Safety net: create a log row even if producer failed to insert one.
    const insertResult = await supabase
      .from('email_logs')
      .insert({
        user_id: payload.userId ?? null,
        recipient: payload.recipient,
        email_type: payload.emailType,
        subject: payload.subject ?? buildSubject(payload),
        template_name: payload.emailType,
        status: 'queued',
      })
      .select()
      .single()

    if (insertResult.data) {
      log = insertResult.data as EmailLogRow
    } else {
      console.error('[email] Failed to create email log:', insertResult.error)
    }
  }

  // Step 2: Build the subject line if not provided
  const subject = payload.subject ?? buildSubject(payload)

  // Step 2a: Respect maintenance mode (blocks non-critical emails)
  const settings = await getEmailSettings().catch(() => null)
  const maintenanceCheck = isMaintenanceModeBlocking(settings, payload.emailType)
  if (maintenanceCheck.blocked) {
    console.warn(`[email] Blocked dispatch for ${payload.emailType}: ${maintenanceCheck.reason}`)
    await markFailed(supabase, log?.id ?? null, maintenanceCheck.reason ?? 'Blocked by maintenance mode')
    return { ok: false, error: maintenanceCheck.reason ?? 'Blocked by maintenance mode' }
  }

  try {
    // Step 3: Load DB template and render
    let html: string
    let templateId: string | null = null
    let variablesUsed: Record<string, unknown> | null = null

    const dbTemplate = await getTemplateByType(payload.emailType)
    if (dbTemplate) {
      const vars = payloadToVariables(payload)
      const result = await renderDbTemplate(dbTemplate, vars)
      html = result.html
      templateId = dbTemplate.id
      variablesUsed = vars

      if (result.missingVariables.length > 0) {
        console.warn(
          `[email] DB template ${payload.emailType} missing variables:`,
          result.missingVariables.join(', ')
        )
      }
    } else {
      const errMsg = `No enabled DB template found for type: ${payload.emailType}`
      await markFailed(supabase, log?.id ?? null, errMsg)
      return { ok: false, error: errMsg }
    }

    // Step 3b: Resolve attachments from {{attachment:filename}} placeholders
    const attachmentFilenames = extractAttachments(html)
    const attachments: { filename: string; content: string }[] = []
    if (attachmentFilenames.length > 0) {
      for (const filename of attachmentFilenames) {
        const attachment = await fetchAttachmentBase64(filename)
        if (attachment) {
          attachments.push({
            filename: attachment.filename,
            content: attachment.content,
          })
        } else {
          console.warn(`[email] Attachment not found in storage: ${filename}`)
        }
      }
      html = stripAttachmentPlaceholders(html)
    }

    // Step 4: Send via Resend
    const resend = await getResendClient()
    const sender = await getSenderAddress()
    const from = `"${sender.name}" <${sender.email}>`

    const { data, error } = await resend.emails.send({
      from,
      to: payload.recipient,
      subject,
      html,
      ...(attachments.length > 0 ? { attachments } : {}),
      tags: [
        { name: 'email_type', value: payload.emailType },
        ...(payload.userId ? [{ name: 'user_id', value: payload.userId }] : []),
        ...(templateId ? [{ name: 'template_id', value: templateId }] : []),
      ],
    })

    if (error || !data?.id) {
      const errMsg = error?.message ?? 'Resend returned no message id'
      await markFailed(supabase, log?.id ?? null, errMsg)
      return { ok: false, error: errMsg }
    }

    // Step 5: Update log as sent
    const update: Partial<EmailLogRow> = {
      status: 'sent',
      provider_message_id: data.id,
      resend_id: data.id,
      sent_at: new Date().toISOString(),
      subject,
      template_id: templateId,
      variables_used: variablesUsed as import('../../../types/database').Json | undefined,
    }

    if (log?.id) {
      await supabase.from('email_logs').update(update).eq('id', log.id)
      // Log sent event for the audit trail
      await logEmailEvent(log.id, 'sent', data.id, { email_type: payload.emailType }).catch(() => {})
    }

    return { ok: true, messageId: data.id, resendId: data.id }
  } catch (error) {
    const errMsg = error instanceof Error ? error.message : 'Unknown dispatch error'
    console.error('[email] Dispatch failed:', errMsg)
    await markFailed(supabase, log?.id ?? null, errMsg)
    return { ok: false, error: errMsg }
  }
}

/**
 * Convert typed EmailJobPayload to flat variables for the template engine.
 * Arrays and objects are stringified (triggers should pre-render them to HTML
 * and pass as `_html` fields for best results).
 */
function payloadToVariables(
  payload: EmailJobPayload
): Record<string, string> {
  const vars: Record<string, string> = {}

  // Common fields
  vars.email_type = payload.emailType
  if (payload.userId) vars.user_id = payload.userId
  vars.recipient = payload.recipient
  if (payload.subject) vars.subject = payload.subject

  switch (payload.emailType) {
    case 'welcome':
      vars.customer_name = payload.customerName
      break
    case 'email_verification':
      vars.customer_name = payload.customerName
      vars.verification_url = payload.verificationUrl
      break
    case 'password_reset':
      vars.customer_name = payload.customerName
      vars.reset_url = payload.resetUrl
      break
    case 'account_link_confirmation':
      vars.customer_name = payload.customerName
      vars.confirm_url = payload.confirmUrl
      vars.order_count = String(payload.orderCount)
      break
    case 'order_placed_customer':
      vars.order_number = payload.orderNumber
      vars.customer_name = payload.customerName
      vars.order_total = payload.total
      vars.order_url = payload.orderUrl
      // items should be pre-rendered as items_html by the trigger
      if (payload.itemsHtml) vars.items_html = payload.itemsHtml
      else if (payload.items?.length) vars.items_html = renderOrderItemsHtml(payload.items)
      break
    case 'order_placed_admin':
      vars.order_number = payload.orderNumber
      vars.customer_name = payload.customerName
      vars.customer_email = payload.customerEmail
      vars.order_total = payload.total
      vars.admin_order_url = payload.adminOrderUrl
      break
    case 'model_validation_pass':
      vars.order_number = payload.orderNumber
      vars.customer_name = payload.customerName
      if (payload.adminQuoteUrl) vars.admin_quote_url = payload.adminQuoteUrl
      break
    case 'model_validation_fail':
      vars.order_number = payload.orderNumber
      vars.customer_name = payload.customerName
      if (payload.issuesHtml) vars.issues_html = payload.issuesHtml
      else if (payload.issues?.length) vars.issues_html = renderIssuesHtml(payload.issues)
      if (payload.adminQuoteUrl) vars.admin_quote_url = payload.adminQuoteUrl
      break
    case 'production_started':
      vars.order_number = payload.orderNumber
      vars.customer_name = payload.customerName
      if (payload.printBedName) vars.print_bed_name = payload.printBedName
      if (payload.estimatedCompletionDate)
        vars.estimated_completion_date = payload.estimatedCompletionDate
      break
    case 'order_shipped':
      vars.order_number = payload.orderNumber
      vars.customer_name = payload.customerName
      vars.tracking_number = payload.trackingNumber
      vars.courier_name = payload.courierName
      vars.tracking_url = payload.trackingUrl
      if (payload.estimatedDelivery) vars.estimated_delivery = payload.estimatedDelivery
      if (payload.itemsHtml) vars.items_html = payload.itemsHtml
      else if (payload.items?.length) vars.items_html = renderShippedItemsHtml(payload.items)
      break
    case 'delivery_confirmation':
      vars.order_number = payload.orderNumber
      vars.customer_name = payload.customerName
      if (payload.reviewUrl) vars.review_url = payload.reviewUrl
      break
    case 'payment_receipt':
      vars.order_number = payload.orderNumber
      vars.customer_name = payload.customerName
      vars.order_date = payload.orderDate
      vars.order_url = payload.orderUrl
      if (payload.itemsHtml) vars.items_html = payload.itemsHtml
      else if (payload.items?.length) vars.items_html = renderOrderItemsHtml(payload.items)
      if (payload.pricingHtml) vars.pricing_html = payload.pricingHtml
      else vars.pricing_html = renderPricingHtml(payload.pricing)
      if (payload.paymentHtml) vars.payment_html = payload.paymentHtml
      else vars.payment_html = renderPaymentHtml(payload.payment)
      if (payload.shippingAddressHtml)
        vars.shipping_address_html = payload.shippingAddressHtml
      else vars.shipping_address_html = renderShippingAddressHtml(payload.shippingAddress)
      if (payload.receiptUrl) vars.receipt_url = payload.receiptUrl
      break
    case 'payment_failed':
      vars.order_number = payload.orderNumber
      vars.customer_name = payload.customerName
      vars.amount = payload.amount
      vars.retry_url = payload.retryUrl
      break
    case 'refund_issued':
      vars.order_number = payload.orderNumber
      vars.customer_name = payload.customerName
      vars.refund_amount = payload.refundAmount
      vars.refund_method = payload.refundMethod
      if (payload.expectedDate) vars.expected_date = payload.expectedDate
      break
    case 'contact_notification':
      vars.sender_name = payload.senderName
      vars.sender_email = payload.senderEmail
      vars.sender_phone = payload.senderPhone
      vars.message = payload.message
      break
  }

  return vars
}

async function markFailed(
  supabase: ReturnType<typeof createAdminClient>,
  logId: string | null,
  errorMessage: string
) {
  if (!logId) return
  await supabase
    .from('email_logs')
    .update({
      status: 'failed',
      failed_at: new Date().toISOString(),
      error_message: errorMessage,
    })
    .eq('id', logId)

  await logEmailEvent(logId, 'failed', null, { error: errorMessage }).catch(() => {})
}

function buildSubject(payload: EmailJobPayload): string {
  switch (payload.emailType) {
    case 'welcome':
      return 'Welcome to Flux3D!'
    case 'email_verification':
      return 'Verify your email address'
    case 'password_reset':
      return 'Reset your Flux3D password'
    case 'account_link_confirmation':
      return 'Confirm your WhatsApp account link'
    case 'order_placed_customer':
      return `Order ${payload.orderNumber} confirmed — Flux3D`
    case 'order_placed_admin':
      return `[Admin] New order ${payload.orderNumber}`
    case 'model_validation_pass':
      return `Your 3D model for order ${payload.orderNumber} passed validation`
    case 'model_validation_fail':
      return `Action needed: 3D model issue for order ${payload.orderNumber}`
    case 'production_started':
      return `Production started for order ${payload.orderNumber}`
    case 'order_shipped':
      return `Your order ${payload.orderNumber} has shipped 🚚`
    case 'delivery_confirmation':
      return `Order ${payload.orderNumber} delivered — how did we do?`
    case 'payment_receipt':
      return `Payment receipt for order ${payload.orderNumber}`
    case 'payment_failed':
      return `Payment failed for order ${payload.orderNumber}`
    case 'refund_issued':
      return `Refund issued for order ${payload.orderNumber}`
    case 'contact_notification':
      return `New contact form submission from ${payload.senderName}`
    default:
      return 'Flux3D Notification'
  }
}
