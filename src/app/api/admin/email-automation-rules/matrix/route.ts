import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminClient } from '@/lib/supabase/admin'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { logAdminAction } from '@/lib/admin/auditLog'
import type { EmailAutomationRuleRow } from 'types/database'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// ============================================================================
// Hardcoded event-to-template mapping for the notification matrix
// ============================================================================

const MATRIX_EVENTS: Array<{
  event_name: string
  label: string
  customer_email_type: string | null
  admin_email_type: string | null
}> = [
  { event_name: 'user_registered', label: 'User Registered', customer_email_type: 'welcome', admin_email_type: null },
  { event_name: 'email_verification_requested', label: 'Email Verification Requested', customer_email_type: 'email_verification', admin_email_type: null },
  { event_name: 'password_reset_requested', label: 'Password Reset Requested', customer_email_type: 'password_reset', admin_email_type: null },
  { event_name: 'order_created', label: 'Order Created', customer_email_type: 'order_placed_customer', admin_email_type: 'order_placed_admin' },
  { event_name: 'model_validation_passed', label: 'Model Validation Passed', customer_email_type: 'model_validation_pass', admin_email_type: null },
  { event_name: 'model_validation_failed', label: 'Model Validation Failed', customer_email_type: 'model_validation_fail', admin_email_type: null },
  { event_name: 'production_started', label: 'Production Started', customer_email_type: 'production_started', admin_email_type: null },
  { event_name: 'order_shipped', label: 'Order Shipped', customer_email_type: 'order_shipped', admin_email_type: null },
  { event_name: 'order_delivered', label: 'Order Delivered', customer_email_type: 'delivery_confirmation', admin_email_type: null },
  { event_name: 'payment_captured', label: 'Payment Captured', customer_email_type: 'payment_receipt', admin_email_type: null },
  { event_name: 'payment_failed', label: 'Payment Failed', customer_email_type: 'payment_failed', admin_email_type: null },
  { event_name: 'refund_processed', label: 'Refund Processed', customer_email_type: 'refund_issued', admin_email_type: null },
  { event_name: 'contact_form_submitted', label: 'Contact Form Submitted', customer_email_type: null, admin_email_type: 'contact_notification' },
]

/**
 * GET /api/admin/email-automation-rules/matrix
 *
 * Returns a static matrix with current rule states.
 */
export async function GET() {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const supabase = createAdminClient()

    // Fetch all rules with their templates
    const { data: rules } = await supabase
      .from('email_automation_rules')
      .select('*, email_templates(email_type)')

    const typedRules = (rules ?? []) as Array<
      EmailAutomationRuleRow & { email_templates: { email_type: string } | null }
    >

    // Build a lookup: event_name -> target_audience -> rule
    const ruleMap = new Map<string, Map<string, EmailAutomationRuleRow>>()
    for (const r of typedRules) {
      const eventMap = ruleMap.get(r.event_name) ?? new Map()
      eventMap.set(r.target_audience, r)
      ruleMap.set(r.event_name, eventMap)
    }

    const matrix = MATRIX_EVENTS.map((evt) => {
      const eventMap = ruleMap.get(evt.event_name)
      const customerRule = eventMap?.get('customer')
      const adminRule = eventMap?.get('admin')

      return {
        event_name: evt.event_name,
        label: evt.label,
        customer: customerRule
          ? { enabled: customerRule.is_enabled, ruleId: customerRule.id }
          : null,
        admin: adminRule
          ? { enabled: adminRule.is_enabled, ruleId: adminRule.id }
          : null,
      }
    })

    return NextResponse.json({ data: matrix })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}

/**
 * POST /api/admin/email-automation-rules/matrix
 *
 * Toggle a matrix cell.
 * Body: { event_name, target_audience: 'customer' | 'admin', enabled: boolean }
 */
export async function POST(req: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const body = await req.json()
    const eventName = String(body.event_name ?? '').trim()
    const targetAudience = String(body.target_audience ?? '').trim() as 'customer' | 'admin'
    const enabled = body.enabled === true

    if (!eventName || !targetAudience) {
      return NextResponse.json(
        { error: 'Missing event_name or target_audience' },
        { status: 400 }
      )
    }

    const supabase = createAdminClient()

    // Find the email_type for this cell
    const mapping = MATRIX_EVENTS.find((e) => e.event_name === eventName)
    if (!mapping) {
      return NextResponse.json({ error: 'Unknown event_name' }, { status: 400 })
    }

    const emailType =
      targetAudience === 'customer' ? mapping.customer_email_type : mapping.admin_email_type
    if (!emailType) {
      return NextResponse.json(
        { error: `No default template for ${targetAudience} on ${eventName}` },
        { status: 400 }
      )
    }

    // Find existing rule
    const { data: existing } = await supabase
      .from('email_automation_rules')
      .select('*')
      .eq('event_name', eventName)
      .eq('target_audience', targetAudience)
      .maybeSingle()

    if (existing) {
      // Update is_enabled
      const { data: updated, error: updateError } = await supabase
        .from('email_automation_rules')
        .update({ is_enabled: enabled })
        .eq('id', existing.id)
        .select()
        .single()

      if (updateError || !updated) {
        return NextResponse.json(
          { error: updateError?.message ?? 'Update failed' },
          { status: 500 }
        )
      }

      await logAdminAction({
        admin_id: auth.user.id,
        action: 'toggle_email_automation_rule',
        target_type: 'setting',
        target_id: updated.id,
        old_value: existing as Record<string, unknown>,
        new_value: updated as Record<string, unknown>,
      })

      return NextResponse.json({ data: updated })
    }

    if (!enabled) {
      // Nothing to disable if no rule exists
      return NextResponse.json({ data: null })
    }

    // Find default template
    const { data: template } = await supabase
      .from('email_templates')
      .select('id')
      .eq('email_type', emailType)
      .eq('is_system', true)
      .eq('is_enabled', true)
      .maybeSingle()

    if (!template) {
      return NextResponse.json(
        { error: `No system template found for ${emailType}` },
        { status: 400 }
      )
    }

    // Create new rule
    const insert = {
      event_name: eventName,
      template_id: template.id,
      target_audience: targetAudience,
      delay_minutes: 0,
      is_enabled: true,
      conditions: {},
      priority: 0,
    }

    const { data: created, error: insertError } = await supabase
      .from('email_automation_rules')
      .insert(insert)
      .select()
      .single()

    if (insertError || !created) {
      return NextResponse.json(
        { error: insertError?.message ?? 'Insert failed' },
        { status: 500 }
      )
    }

    const rule = created as EmailAutomationRuleRow

    await logAdminAction({
      admin_id: auth.user.id,
      action: 'create_email_automation_rule',
      target_type: 'setting',
      target_id: rule.id,
      old_value: null,
      new_value: rule as Record<string, unknown>,
    })

    return NextResponse.json({ data: rule }, { status: 201 })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
