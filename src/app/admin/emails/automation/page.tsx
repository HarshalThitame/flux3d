import { requireAdminUser } from '@/lib/admin/server'
import { createAdminClient } from '@/lib/supabase/admin'
import AutomationRulesClient from '@/components/admin/emails/AutomationRulesClient'
import type { EmailAutomationRuleRow, EmailTemplateRow } from 'types/database'

export const dynamic = 'force-dynamic'

export default async function EmailAutomationPage() {
  await requireAdminUser()

  const supabase = createAdminClient()

  // Fetch rules with template info
  const { data: rules, error: rulesError } = await supabase
    .from('email_automation_rules')
    .select('*, email_templates(name, email_type)')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(100)

  if (rulesError) {
    console.error('[admin/emails/automation] DB error (rules):', rulesError.message)
  }

  // Fetch enabled templates for the dropdown
  const { data: templates, error: templatesError } = await supabase
    .from('email_templates')
    .select('*')
    .eq('is_enabled', true)
    .order('name', { ascending: true })
    .limit(200)

  if (templatesError) {
    console.error('[admin/emails/automation] DB error (templates):', templatesError.message)
  }

  return (
    <AutomationRulesClient
      initialRules={(rules ?? []) as Array<EmailAutomationRuleRow & { email_templates: { name: string; email_type: string } }>}
      initialTemplates={(templates ?? []) as EmailTemplateRow[]}
    />
  )
}
