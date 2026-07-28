import { requireAdminUser } from '@/lib/admin/server'
import { createAdminClient } from '@/lib/supabase/admin'
import NotificationMatrix from '@/components/admin/emails/NotificationMatrix'
import type { EmailAutomationRuleRow, EmailTemplateRow } from 'types/database'

export const dynamic = 'force-dynamic'

const ALL_EVENTS = [
  { event_name: 'user_registered', label: 'User Registered' },
  { event_name: 'email_verification_requested', label: 'Email Verification Requested' },
  { event_name: 'password_reset_requested', label: 'Password Reset Requested' },
  { event_name: 'order_created', label: 'Order Created' },
  { event_name: 'model_validation_passed', label: 'Model Validation Passed' },
  { event_name: 'model_validation_failed', label: 'Model Validation Failed' },
  { event_name: 'production_started', label: 'Production Started' },
  { event_name: 'order_shipped', label: 'Order Shipped' },
  { event_name: 'order_delivered', label: 'Order Delivered' },
  { event_name: 'payment_captured', label: 'Payment Captured' },
  { event_name: 'payment_failed', label: 'Payment Failed' },
  { event_name: 'refund_processed', label: 'Refund Processed' },
  { event_name: 'contact_form_submitted', label: 'Contact Form Submitted' },
]

export default async function EmailMatrixPage() {
  await requireAdminUser()

  const supabase = createAdminClient()

  // Fetch all system templates (to link rules to template names)
  const { data: templates } = await supabase
    .from('email_templates')
    .select('id, name, email_type')
    .eq('is_system', true)

  const templateMap = new Map(
    (templates ?? []).map((t: { id: string; name: string; email_type: string }) => [t.email_type, t])
  )

  // Fetch all automation rules
  const { data: rules } = await supabase
    .from('email_automation_rules')
    .select('*')

  // Build matrix rows
  const rows = ALL_EVENTS.map((event) => {
    const eventRules = (rules ?? []).filter(
      (r: EmailAutomationRuleRow) => r.event_name === event.event_name
    )

    const customerRule = eventRules.find((r: EmailAutomationRuleRow) =>
      r.target_audience === 'customer' || r.target_audience === 'both'
    )
    const adminRule = eventRules.find((r: EmailAutomationRuleRow) =>
      r.target_audience === 'admin' || r.target_audience === 'both'
    )

    return {
      event_name: event.event_name,
      label: event.label,
      customer: customerRule
        ? { enabled: customerRule.is_enabled, ruleId: customerRule.id }
        : null,
      admin: adminRule
        ? { enabled: adminRule.is_enabled, ruleId: adminRule.id }
        : null,
    }
  })

  return <NotificationMatrix initialMatrix={rows} />
}
