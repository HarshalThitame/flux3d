// ============================================================================
// DB Template Loader & Renderer
// ============================================================================
// Fetches templates from the email_templates table and composes the engine +
// wrapper into final HTML.
//
// Usage:
//   const template = await getTemplateByType('welcome')
//   const html = await renderDbTemplate(template, { customer_name: 'Rutik' })
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import { replaceVariables, extractMissingVariables } from './template-engine'
import { getEmailBranding, wrapTemplate } from './template-wrapper'

/** Last-resort support address when no branding/admin configuration exists */
const FALLBACK_SUPPORT_EMAIL = 'support@flux3d.in'

import type { EmailTemplateRow } from '../../../types/database'

export async function getTemplateByType(
  emailType: string
): Promise<EmailTemplateRow | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('email_templates')
    .select('*')
    .eq('email_type', emailType)
    .eq('is_enabled', true)
    .order('is_system', { ascending: false }) // prefer system templates
    .limit(1)
    .maybeSingle()

  return (data as EmailTemplateRow | null) ?? null
}

export async function getTemplateById(
  id: string
): Promise<EmailTemplateRow | null> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('email_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle()

  return (data as EmailTemplateRow | null) ?? null
}

export async function renderDbTemplate(
  template: EmailTemplateRow,
  variables: Record<string, string | number | boolean | undefined | null>,
  branding?: Parameters<typeof wrapTemplate>[1]
): Promise<{ html: string; missingVariables: string[] }> {
  const brand = branding ?? (await getEmailBranding())
  const vars = {
    support_email: brand.support_email || FALLBACK_SUPPORT_EMAIL,
    ...variables,
  }
  const body = replaceVariables(template.html_body, vars)
  const missingVariables = extractMissingVariables(template.html_body, vars)

  const html = wrapTemplate(body, brand)

  return { html, missingVariables }
}

/**
 * Render arbitrary HTML body through the template engine + branded wrapper.
 * Used by the admin compare modal to preview version snapshots.
 */
export async function renderHtmlPreview(
  htmlBody: string,
  variables: Record<string, string | number | boolean | undefined | null>,
  branding?: Parameters<typeof wrapTemplate>[1]
): Promise<string> {
  const brand = branding ?? (await getEmailBranding())
  const vars = {
    support_email: brand.support_email || FALLBACK_SUPPORT_EMAIL,
    ...variables,
  }
  const body = replaceVariables(htmlBody, vars)
  return wrapTemplate(body, brand)
}
