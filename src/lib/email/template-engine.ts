// ============================================================================
// Template Engine — {{variable}} replacement
// ============================================================================
// Rules:
//   - {{key}} is replaced with the corresponding value from the vars map.
//   - Values are HTML-escaped to prevent injection.
//   - Unfilled variables are left as-is so admins can spot them in previews.
//   - No loop syntax — backend pre-renders arrays into HTML snippets.
// ============================================================================

function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function replaceVariables(
  templateHtml: string,
  variables: Record<string, string | number | boolean | undefined | null>
): string {
  return templateHtml.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    const value = variables[key]
    if (value === undefined || value === null) {
      // Leave unfilled variables visible for debugging
      return `{{${key}}}`
    }
    // If the value already looks like HTML (starts with <), trust it.
    // This allows backend pre-rendered snippets like {{items_html}} to pass through.
    const str = String(value)
    if (str.trimStart().startsWith('<')) {
      return str
    }
    return escapeHtml(str)
  })
}

import { convert } from 'html-to-text'

export function extractMissingVariables(
  templateHtml: string,
  variables: Record<string, unknown>
): string[] {
  const missing: string[] = []
  templateHtml.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => {
    if (variables[key] === undefined || variables[key] === null) {
      missing.push(key)
    }
    return ''
  })
  return [...new Set(missing)]
}

/**
 * Generate a plain-text fallback from rendered HTML.
 * Used to auto-populate the plain_text column on template save.
 */
export function generatePlainText(html: string): string {
  return convert(html, {
    wordwrap: 80,
    selectors: [
      { selector: 'a', options: { hideLinkHrefIfSameAsText: true } },
      { selector: 'img', format: 'skip' },
    ],
  })
}

// ============================================================================
// Attachment placeholders — {{attachment:filename}}
// ============================================================================

const ATTACHMENT_REGEX = /\{\{attachment:([\w.-]+)\}\}/g

export function extractAttachments(templateHtml: string): string[] {
  const filenames: string[] = []
  let match: RegExpExecArray | null
  while ((match = ATTACHMENT_REGEX.exec(templateHtml)) !== null) {
    filenames.push(match[1])
  }
  return [...new Set(filenames)]
}

export function stripAttachmentPlaceholders(templateHtml: string): string {
  return templateHtml.replace(ATTACHMENT_REGEX, '')
}
