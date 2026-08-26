/**
 * Defense-in-depth sanitizer for admin-authored rich text (Tiptap) rendered
 * via dangerouslySetInnerHTML on public pages. Strips script/style blocks,
 * inline event handlers, and javascript: URLs while preserving formatting.
 */
export function sanitizeShopRichHtml(html: string) {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/\son\w+=(["']).*?\1/gi, '')
    .replace(/\son\w+=\{[^}]*\}/gi, '')
    .replace(/javascript:/gi, '')
    .replace(/data:text\/html/gi, '')
}
