// ============================================================================
// Template Wrapper — Branded header/footer shell
// ============================================================================
// Wraps raw template body HTML inside a responsive 600px email shell.
// Reads branding config from the email_branding singleton table.
// Supports light/dark mode via CSS media query.
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'
import type { EmailBrandingRow } from '../../../types/database'

const DEFAULT_PRIMARY = '#FF5C1A'
const DEFAULT_SECONDARY = '#39BDF8'
const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://flux3d.in'

export async function getEmailBranding(): Promise<EmailBrandingRow> {
  const supabase = createAdminClient()
  const { data } = await supabase
    .from('email_branding')
    .select('*')
    .eq('id', 'default')
    .maybeSingle()

  if (data) return data as EmailBrandingRow

  return {
    id: 'default',
    logo_url: `${SITE_URL}/logo.png`,
    company_name: 'Flux3D',
    address: null,
    gst_number: null,
    support_email: 'support@flux3d.in',
    support_phone: null,
    primary_color: DEFAULT_PRIMARY,
    secondary_color: DEFAULT_SECONDARY,
    accent_color: null,
    footer_text: null,
    social_icons: {},
    dark_mode_css: null,
    header_html: null,
    footer_html: null,
    updated_at: null,
  }
}

export function wrapTemplate(
  bodyHtml: string,
  branding?: Partial<EmailBrandingRow>
): string {
  const b = branding ?? {}
  const primary = b.primary_color || DEFAULT_PRIMARY
  const secondary = b.secondary_color || DEFAULT_SECONDARY
  const logoUrl = b.logo_url || `${SITE_URL}/logo.png`
  const companyName = b.company_name || 'Flux3D'
  const supportEmail = b.support_email || 'support@flux3d.in'
  const address = b.address || ''
  const gst = b.gst_number || ''
  const footerText = b.footer_text || ''

  // Build social icons row
  const socials = (b.social_icons ?? {}) as Record<string, string>
  const socialLinks = Object.entries(socials)
    .filter(([, url]) => url)
    .map(([platform, url]) => {
      const icon = getSocialIconSvg(platform)
      return `<a href="${escapeAttr(url)}" style="display:inline-block;margin:0 6px;">${icon}</a>`
    })
    .join('')

  const customHeader = b.header_html || ''
  const customFooter = b.footer_html || ''

  const darkCss = b.dark_mode_css || `
    @media (prefers-color-scheme: dark) {
      .email-bg { background-color: #1a1a1a !important; }
      .email-text { color: #e5e5e5 !important; }
      .email-muted { color: #9ca3af !important; }
      .email-card { background-color: #262626 !important; border-color: #333 !important; }
      .email-hr { border-color: #333 !important; }
    }
  `

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <style>
    ${darkCss}
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; }
    table { border-collapse: collapse; }
    img { max-width: 100%; height: auto; }
  </style>
</head>
<body class="email-bg" style="background-color:#f3f4f6;margin:0;padding:24px 0;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
    <tr>
      <td align="center">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="max-width:600px;width:100%;background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px -1px rgba(0,0,0,0.1);" class="email-card">
          <!-- Header -->
          <tr>
            <td style="padding:24px 32px 16px;text-align:center;">
              ${customHeader}
              <img src="${escapeAttr(logoUrl)}" alt="${escapeAttr(companyName)}" width="120" style="margin:0 auto;display:block;">
              <p style="font-size:11px;font-weight:700;color:${escapeAttr(primary)};text-align:center;letter-spacing:3px;margin:8px 0 0;text-transform:uppercase;">${escapeHtml(companyName)}</p>
            </td>
          </tr>
          <tr>
            <td>
              <hr class="email-hr" style="border:none;border-top:1px solid #e5e7eb;margin:0 32px;">
            </td>
          </tr>
          <!-- Body -->
          <tr>
            <td style="padding:24px 32px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:16px 32px 32px;text-align:center;">
              <hr class="email-hr" style="border:none;border-top:1px solid #e5e7eb;margin:0 0 16px;">
              ${customFooter}
              ${socialLinks ? `<p style="margin:0 0 12px;">${socialLinks}</p>` : ''}
              ${footerText ? `<p style="font-size:13px;line-height:1.5;color:#6b7280;margin:0 0 8px;" class="email-muted">${footerText}</p>` : ''}
              <p style="font-size:13px;line-height:1.5;color:#6b7280;margin:0 0 8px;" class="email-muted">
                Questions? <a href="mailto:${escapeAttr(supportEmail)}" style="color:${escapeAttr(secondary)};text-decoration:underline;">Contact our support team</a> or reply to this email.
              </p>
              ${address ? `<p style="font-size:12px;line-height:1.4;color:#9ca3af;margin:0 0 4px;" class="email-muted">${escapeHtml(address).replace(/\n/g, '<br>')}</p>` : ''}
              ${gst ? `<p style="font-size:12px;line-height:1.4;color:#9ca3af;margin:0;" class="email-muted">GST: ${escapeHtml(gst)}</p>` : ''}
              <p style="font-size:12px;line-height:1.4;color:#9ca3af;margin:8px 0 0;" class="email-muted">${escapeHtml(companyName)} — Precision 3D Printing</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function escapeAttr(url: string): string {
  return url.replace(/"/g, '&quot;').replace(/'/g, '&#039;')
}

function getSocialIconSvg(platform: string): string {
  // Minimal 20x20 colored circles with letter/text for common platforms
  const map: Record<string, string> = {
    instagram: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="12" fill="#E4405F"/><path d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0 8a3 3 0 1 1 0-6 3 3 0 0 1 0 6Zm4.5-6.5a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" fill="#fff"/></svg>`,
    facebook: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="12" fill="#1877F2"/><path d="M14 8h-1.5C11 8 10 9 10 10.5V12H8v2h2v4h2v-4h1.5l.5-2H12v-1c0-.3.2-.5.5-.5H14V8Z" fill="#fff"/></svg>`,
    linkedin: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="12" fill="#0A66C2"/><path d="M8 7a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm0 3h2v6H8v-6Zm3 0h2v1h0a2 2 0 0 1 2-1c2 0 2.5 1.5 2.5 3v3h-2v-2.5c0-.5 0-1.5-1-1.5s-1 .5-1 1.5V16H10v-6Z" fill="#fff"/></svg>`,
    twitter: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="12" fill="#000"/><path d="M14 7h2l-3 4 3.5 4.5h-2.5L11.5 12 9 15.5H7l3-4-3-4.5h2.5L11.5 10 14 7Z" fill="#fff"/></svg>`,
    youtube: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><rect width="24" height="24" rx="12" fill="#FF0000"/><path d="M10 14.5v-5l4.5 2.5L10 14.5Z" fill="#fff"/></svg>`,
  }
  return map[platform.toLowerCase()] ?? `<span style="font-size:12px;color:#666;">${escapeHtml(platform)}</span>`
}
