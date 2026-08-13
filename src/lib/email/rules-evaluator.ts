import { createAdminClient } from '@/lib/supabase/admin'
import type { EmailAutomationRuleRow } from '../../../types/database'

const EMAIL_TYPE_TO_EVENT: Record<string, string> = {
  welcome: 'user_registered',
  email_verification: 'email_verification_requested',
  password_reset: 'password_reset_requested',
  password_changed: 'password_changed',
  account_link_confirmation: 'account_linking_requested',
  order_placed_customer: 'order_created',
  order_placed_admin: 'order_created',
  model_validation_pass: 'model_validation_passed',
  model_validation_fail: 'model_validation_failed',
  production_started: 'production_started',
  order_shipped: 'order_shipped',
  delivery_confirmation: 'order_delivered',
  payment_receipt: 'payment_captured',
  payment_failed: 'payment_failed',
  refund_issued: 'refund_processed',
  contact_notification: 'contact_form_submitted',
}

export type RuleCheckResult = {
  allowed: boolean
  rule: EmailAutomationRuleRow | null
  reason?: string
  delayMinutes?: number
}

export function getEventName(emailType: string): string {
  return EMAIL_TYPE_TO_EVENT[emailType] ?? emailType
}

export async function evaluateAutomationRule(
  emailType: string,
  templateId: string,
): Promise<RuleCheckResult> {
  const eventName = getEventName(emailType)

  const supabase = createAdminClient()
  const { data: rules } = await supabase
    .from('email_automation_rules')
    .select('*')
    .eq('event_name', eventName)
    .eq('template_id', templateId)
    .limit(1)

  const rule = (rules?.[0] ?? null) as EmailAutomationRuleRow | null

  if (!rule) {
    return { allowed: true, rule: null }
  }

  if (!rule.is_enabled) {
    return {
      allowed: false,
      rule,
      reason: `Automation rule for "${eventName}" is disabled. Enable it in Email Center > Automation.`,
    }
  }

  return {
    allowed: true,
    rule,
    delayMinutes: rule.delay_minutes,
  }
}
