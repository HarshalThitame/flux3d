export type WhatsAppKnowledgeRecord = {
  id: string
  sourceKey: string
  title: string
  content: string
  tags: string[]
  priority: number
  active: boolean
  createdAt: string | null
  updatedAt: string | null
}

export type WhatsAppKnowledgeFormState = {
  id?: string
  sourceKey: string
  title: string
  content: string
  tags: string
  priority: string
  active: boolean
}

export function normalizeWhatsAppKnowledgeSourceKey(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
}

export function parseWhatsAppKnowledgeTags(value: string | string[]) {
  const raw = Array.isArray(value) ? value : value.split(/[\n,]/g)
  return raw
    .map((tag) => tag.trim())
    .filter(Boolean)
}

export function formatWhatsAppKnowledgeTags(tags: string[]) {
  return tags.filter(Boolean).join(', ')
}
