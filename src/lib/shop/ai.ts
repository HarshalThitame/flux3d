import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'

export type AiTone = 'professional' | 'playful' | 'technical' | 'minimal'

export type AiGenerationKind =
  | 'short_description'
  | 'long_description'
  | 'meta_title'
  | 'meta_description'
  | 'tags'
  | 'occasion_tags'
  | 'all'

export type AiGenerateInput = {
  kind: AiGenerationKind
  name: string
  category?: string
  description?: string
  tags?: string[]
  occasion_tags?: string[]
  tone?: AiTone
  existing?: string
}

export type AiAllResult = {
  short_description: string
  long_description: string
  meta_title: string
  meta_description: string
  tags: string[]
  occasion_tags: string[]
}

export type AiGenerateResult = string | string[] | AiAllResult

const SHOP_AI_MODEL = process.env.SHOP_AI_MODEL?.trim() || 'gpt-4.1-mini'

const TONE_GUIDE: Record<AiTone, string> = {
  professional: 'Write in a professional, trustworthy, premium tone.',
  playful: 'Write in a playful, energetic, friendly tone.',
  technical: 'Write in a technical, detailed tone with precise specifications.',
  minimal: 'Write in a minimal, concise, no-filler tone.',
}

export function getShopAiClient() {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  return new OpenAI({ apiKey: key })
}

export function buildShopAiContext(input: AiGenerateInput) {
  const tone = TONE_GUIDE[input.tone ?? 'professional']
  const lines = [
    `Product name: ${input.name}`,
    input.category ? `Category: ${input.category}` : null,
    input.description ? `Existing short description: ${input.description}` : null,
    input.tags?.length ? `Tags: ${input.tags.join(', ')}` : null,
    input.occasion_tags?.length ? `Occasion tags: ${input.occasion_tags.join(', ')}` : null,
  ].filter(Boolean)
  return { tone, context: lines.join('\n') }
}

async function complete(client: OpenAI, messages: ChatCompletionMessageParam[], json = false) {
  const completion = await client.chat.completions.create({
    model: SHOP_AI_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: 1200,
    response_format: json ? { type: 'json_object' } : undefined,
  })
  const content = completion.choices[0]?.message?.content ?? ''
  return content.trim()
}

export function stripFences(text: string) {
  return text.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim()
}

export function parseJsonArray(raw: string): string[] {
  try {
    const parsed = JSON.parse(stripFences(raw))
    const items = Array.isArray(parsed) ? parsed : parsed.items ?? parsed.tags ?? parsed.values ?? []
    return items.map(String).map((item: string) => item.trim()).filter(Boolean)
  } catch {
    return raw
      .split(/[,\n]/)
      .map((item) => item.replace(/^[-*\d.\s]+/, '').trim())
      .filter(Boolean)
      .filter((item) => item.length > 1)
  }
}

export function parseAllJson(raw: string): AiAllResult {
  const fallback: AiAllResult = {
    short_description: '',
    long_description: '',
    meta_title: '',
    meta_description: '',
    tags: [],
    occasion_tags: [],
  }
  try {
    const parsed = JSON.parse(stripFences(raw)) as Partial<AiAllResult>
    return {
      short_description: String(parsed.short_description ?? '').trim(),
      long_description: String(parsed.long_description ?? '').trim(),
      meta_title: String(parsed.meta_title ?? '').trim(),
      meta_description: String(parsed.meta_description ?? '').trim(),
      tags: Array.isArray(parsed.tags) ? parsed.tags.map(String) : [],
      occasion_tags: Array.isArray(parsed.occasion_tags) ? parsed.occasion_tags.map(String) : [],
    }
  } catch {
    return fallback
  }
}

export async function generateShopCopy(input: AiGenerateInput): Promise<AiGenerateResult> {
  const client = getShopAiClient()
  if (!client) throw new Error('AI is not configured. Add OPENAI_API_KEY to your environment variables.')

  const name = input.name.trim()
  if (!name) throw new Error('Product name is required before generating AI copy.')

  const { tone, context } = buildShopAiContext(input)
  const system = `You are an expert e-commerce copywriter for Flux3D, a premium 3D-printed home decor and gadget store. ${tone} Return only the requested content with no preamble, no markdown fences, and no explanation.`

  switch (input.kind) {
    case 'short_description': {
      const text = await complete(client, [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `${context}\n\nWrite a punchy short description for this product, 1-2 sentences, maximum 200 characters. It will appear in product cards and listing pages.`,
        },
      ])
      return text.slice(0, 200)
    }

    case 'long_description': {
      const text = await complete(client, [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `${context}\n\nWrite a detailed product description as clean HTML for a rich-text editor. Use only <h2>, <h3>, <p>, <ul>, <li>, <strong>, and <em> tags. Include a features section, materials/build quality, and use-case ideas. Do not wrap in a code block.\n\n${
            input.existing ? `Current description (rewrite and improve it):\n${input.existing}` : ''
          }`,
        },
      ])
      return text
    }

    case 'meta_title': {
      const text = await complete(client, [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `${context}\n\nWrite an SEO-optimized meta title, maximum 60 characters. Include the product name and a compelling keyword.`,
        },
      ])
      return text.slice(0, 60)
    }

    case 'meta_description': {
      const text = await complete(client, [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `${context}\n\nWrite an SEO-optimized meta description, maximum 160 characters. Mention key selling points and a call to action.`,
        },
      ])
      return text.slice(0, 160)
    }

    case 'tags': {
      const text = await complete(
        client,
        [
          { role: 'system', content: system },
          {
            role: 'user',
            content: `${context}\n\nSuggest 6-10 relevant search tags as a JSON object like {"tags": ["tag1", "tag2"]}. Combine material, style, use-case, and customer-intent keywords.`,
          },
        ],
        true
      )
      return parseJsonArray(text).slice(0, 12)
    }

    case 'occasion_tags': {
      const text = await complete(
        client,
        [
          { role: 'system', content: system },
          {
            role: 'user',
            content: `${context}\n\nSuggest 4-6 relevant occasion or gifting tags (e.g. Birthday, Diwali, Anniversary, Office Desk) as a JSON object like {"tags": ["Birthday", "Diwali"]}. Use the exact occasion names already in use where applicable.`,
          },
        ],
        true
      )
      return parseJsonArray(text).slice(0, 12)
    }

    case 'all': {
      const text = await complete(
        client,
        [
          { role: 'system', content: system },
          {
            role: 'user',
            content: `${context}\n\nGenerate a complete product listing and return ONLY a JSON object with exactly these keys:\n- "short_description": a 1-2 sentence summary under 200 characters\n- "long_description": a detailed description as clean HTML using only <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>\n- "meta_title": an SEO title under 60 characters\n- "meta_description": an SEO description under 160 characters\n- "tags": an array of 6-10 strings\n- "occasion_tags": an array of 3-5 strings\n\nDo not include any text outside the JSON object.`,
          },
        ],
        true
      )
      return parseAllJson(text)
    }

    default:
      throw new Error('Unknown AI generation kind.')
  }
}
