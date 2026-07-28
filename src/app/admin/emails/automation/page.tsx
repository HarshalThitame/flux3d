import { requireAdminUser } from '@/lib/admin/server'
import AutomationRulesClient from '@/components/admin/emails/AutomationRulesClient'

export const dynamic = 'force-dynamic'

export default async function EmailAutomationPage() {
  await requireAdminUser()

  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'

  // Fetch rules
  const rulesRes = await fetch(`${baseUrl}/api/admin/email-automation-rules?limit=100`, {
    cache: 'no-store',
  })
  let rules = []
  if (rulesRes.ok) {
    const json = await rulesRes.json()
    rules = json.data ?? []
  } else {
    console.error('[admin/emails/automation] Failed to fetch rules:', await rulesRes.text())
  }

  // Fetch templates
  const templatesRes = await fetch(`${baseUrl}/api/admin/email-templates?limit=200&is_enabled=true`, {
    cache: 'no-store',
  })
  let templates = []
  if (templatesRes.ok) {
    const json = await templatesRes.json()
    templates = json.data ?? []
  } else {
    console.error('[admin/emails/automation] Failed to fetch templates:', await templatesRes.text())
  }

  return (
    <AutomationRulesClient
      initialRules={rules}
      initialTemplates={templates}
    />
  )
}
