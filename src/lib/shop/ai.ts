import OpenAI from 'openai'
import type { ChatCompletionMessageParam } from 'openai/resources/chat/completions'
import type { ProductDimensions } from '@/lib/shop/admin-types'

export type AiTone = 'professional' | 'playful' | 'technical' | 'minimal'

export type AiGenerationKind =
  | 'short_description'
  | 'long_description'
  | 'meta_title'
  | 'meta_description'
  | 'tags'
  | 'occasion_tags'
  | 'all'

export type AiVariantInfo = {
  option_name: string
  option_type?: string
  values?: string[]
}

export type AiDimensionInfo = {
  option_name: string
  option_value: string
  dimensions: ProductDimensions
}

export type AiSkuInfo = {
  variant_combination: Record<string, string | boolean>
  price: number
  compare_at_price: number | null
}

export type AiGenerateInput = {
  kind: AiGenerationKind
  name: string
  category?: string
  description?: string
  tags?: string[]
  occasion_tags?: string[]
  tone?: AiTone
  existing?: string
  prompt?: string
  variants?: AiVariantInfo[]
  variant_dimensions?: AiDimensionInfo[]
  default_dimensions?: ProductDimensions | null
  base_price?: number
  skus?: AiSkuInfo[]
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
  professional: 'a professional, trustworthy, and premium voice',
  playful: 'a playful, energetic, and friendly voice',
  technical: 'a technical, precise, specification-led voice',
  minimal: 'a minimal, concise, no-filler voice',
}

const ENTERPRISE_STANDARDS = `Enterprise copywriting standards you must always follow:
- SEO: naturally weave in high-intent keywords - product name, category, material, variants, and use-case. Never keyword-stuff.
- Structure: clear hierarchy, scannable, benefit-led copy.
- Conversion: open with the strongest benefit, address buyer objections, and give a clear sense of value.
- Accuracy: NEVER invent facts. Only reference variants, dimensions, materials, and prices supplied in the context. Omit a fact rather than fabricate it.
- Locale: use Indian English and reference occasions and use cases relevant to India (e.g. Diwali, gifting, home decor).
- Do not wrap output in markdown fences or code blocks.`

function formatDimensions(dimensions: ProductDimensions): string {
  const parts: string[] = []
  if (dimensions.length_mm || dimensions.width_mm || dimensions.height_mm) {
    const unit = dimensions.dimension_unit || 'mm'
    const values = [dimensions.length_mm, dimensions.width_mm, dimensions.height_mm].filter(
      (value): value is number => value != null
    )
    if (values.length > 0) parts.push(`${values.join('x')}${unit}`)
  }
  if (dimensions.weight_g != null) parts.push(`${dimensions.weight_g}${dimensions.weight_unit || 'g'}`)
  if (dimensions.volume_cc != null) parts.push(`${dimensions.volume_cc}cc`)
  return parts.length > 0 ? parts.join(', ') : ''
}

function buildVariantContext(input: AiGenerateInput): string[] {
  const variants = (input.variants ?? []).filter((variant) => (variant.values ?? []).length > 0)
  if (variants.length === 0) return []
  const lines = variants.map((variant) => `${variant.option_name}: ${(variant.values ?? []).join(', ')}`)
  return [`Available variants:\n${lines.join('\n')}`]
}

function buildDimensionContext(input: AiGenerateInput): string[] {
  const rows: string[] = []
  if (input.default_dimensions) {
    const formatted = formatDimensions(input.default_dimensions)
    if (formatted) rows.push(`Default dimensions: ${formatted}`)
  }
  const variantRows = (input.variant_dimensions ?? [])
    .map((entry) => {
      const formatted = formatDimensions(entry.dimensions)
      return formatted ? `${entry.option_name}: ${entry.option_value} - ${formatted}` : null
    })
    .filter((row): row is string => row !== null)
  if (variantRows.length > 0) rows.push(`Variant dimensions:\n${variantRows.join('\n')}`)
  return rows
}

function buildSkuContext(input: AiGenerateInput): string[] {
  const skus = input.skus ?? []
  if (skus.length === 0) return []
  const prices = skus.map((sku) => sku.price).filter(Number.isFinite)
  if (prices.length === 0) return []
  const min = Math.min(...prices)
  const max = Math.max(...prices)
  const parts = [`SKU pricing: Rs ${min}${max !== min ? ` - Rs ${max}` : ''}`]
  if (skus.some((sku) => sku.compare_at_price != null && sku.compare_at_price > sku.price)) {
    parts.push('Some variants are on sale (compare-at price is higher than the selling price).')
  }
  return parts
}

export function getShopAiClient() {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  return new OpenAI({ apiKey: key })
}

export function buildShopAiContext(input: AiGenerateInput) {
  const tone = TONE_GUIDE[input.tone ?? 'professional']
  const baseLines = [
    `Product name: ${input.name}`,
    input.category ? `Category: ${input.category}` : null,
    input.description ? `Existing short description: ${input.description}` : null,
    input.tags?.length ? `Tags: ${input.tags.join(', ')}` : null,
    input.occasion_tags?.length ? `Occasion tags: ${input.occasion_tags.join(', ')}` : null,
    input.base_price != null && input.base_price > 0 ? `Base price: Rs ${input.base_price}` : null,
  ].filter(Boolean) as string[]

  const context = [
    ...baseLines,
    ...buildVariantContext(input),
    ...buildDimensionContext(input),
    ...buildSkuContext(input),
  ]
    .filter(Boolean)
    .join('\n')

  return { tone, context }
}

function buildSystemPrompt(input: AiGenerateInput) {
  const { tone } = buildShopAiContext(input)
  const merchantPrompt = input.prompt?.trim()
  const merchantBlock = merchantPrompt
    ? `\n\nMerchant instructions - these are REQUIREMENTS, follow them closely and make every section honour them:\n${merchantPrompt}`
    : ''
  return (
    `You are an elite e-commerce copywriter and SEO strategist for Flux3D, a premium 3D-printed home decor, gadget, and gifting store in India. You write product copy that ranks on Google, converts shoppers, and reads like a curated luxury brand.\n\n` +
    `Tone: ${tone}\n\n${ENTERPRISE_STANDARDS}${merchantBlock}`
  )
}

function buildMerchantInstructions(input: AiGenerateInput): string {
  const prompt = input.prompt?.trim()
  if (!prompt) return ''
  return `\n\nMerchant requirements to satisfy in this section:\n${prompt}`
}

async function complete(
  client: OpenAI,
  messages: ChatCompletionMessageParam[],
  json = false,
  maxTokens = 1600
) {
  const completion = await client.chat.completions.create({
    model: SHOP_AI_MODEL,
    messages,
    temperature: 0.7,
    max_tokens: maxTokens,
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

  const system = buildSystemPrompt(input)
  const { context } = buildShopAiContext(input)
  const merchant = buildMerchantInstructions(input)

  const userPrompt = (specific: string) => `${context}\n\n${specific}${merchant}`

  switch (input.kind) {
    case 'short_description': {
      const text = await complete(client, [
        { role: 'system', content: system },
        {
          role: 'user',
          content: userPrompt(
            `Write a punchy short description for this product, 1-2 sentences, maximum 200 characters. Lead with the single strongest benefit, name the material and a key variant or dimension only if available, and end with a compelling hook. It appears in product cards, listing pages, and search snippets.`
          ),
        },
      ])
      return text.slice(0, 200)
    }

    case 'long_description': {
      const text = await complete(client, [
        { role: 'system', content: system },
        {
          role: 'user',
          content: `${context}\n\nWrite a detailed, SEO-rich product description as clean HTML for a rich-text editor. Use only <h2>, <h3>, <p>, <ul>, <li>, <strong>, and <em> tags. Structure it with these sections when the data is available:\n- Overview: what it is and the core benefit\n- Features & Build Quality: material, finish, craft\n- Options: every variant and its values (e.g. colors, sizes, materials)\n- Dimensions & Specifications: use the supplied dimensions and weights\n- Use Cases & Occasions: Indian home decor, gifting (Diwali, birthdays, etc.), desk/workspace\n- Care & Maintenance (brief)\n\nWeave in natural keywords: product name, category, material, and top variants. Do not invent facts that are not in the context. Do not wrap in a code block.${input.existing ? `\n\nCurrent description (rewrite and substantially improve it):\n${input.existing}` : ''}${merchant}`,
        },
      ])
      return text
    }

    case 'meta_title': {
      const text = await complete(client, [
        { role: 'system', content: system },
        {
          role: 'user',
          content: userPrompt(
            `Write an SEO-optimized meta title, maximum 60 characters. Include the product name and a compelling primary keyword (material, benefit, or category). Make it click-worthy without clickbait.`
          ),
        },
      ])
      return text.slice(0, 60)
    }

    case 'meta_description': {
      const text = await complete(client, [
        { role: 'system', content: system },
        {
          role: 'user',
          content: userPrompt(
            `Write an SEO-optimized meta description, maximum 160 characters. Mention the top 2-3 selling points (material, variants, dimensions where relevant) and include a natural call to action.`
          ),
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
            content: userPrompt(
              `Suggest 6-10 relevant search tags as a JSON object like {"tags": ["tag1", "tag2"]}. Combine material, style, use-case, variant names, and customer-intent keywords. Prefer tags shoppers actually search.`
            ),
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
            content: userPrompt(
              `Suggest 4-6 relevant occasion or gifting tags (e.g. Birthday, Diwali, Anniversary, Office Desk) as a JSON object like {"tags": ["Birthday", "Diwali"]}. Use the exact occasion names already in use where applicable.`
            ),
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
            content: userPrompt(
              `Generate a complete, enterprise-grade product listing and return ONLY a JSON object with exactly these keys:\n- "short_description": a 1-2 sentence summary under 200 characters\n- "long_description": a detailed description as clean HTML using only <h2>, <h3>, <p>, <ul>, <li>, <strong>, <em>, structured with overview, features/build quality, options (all variants), dimensions & specifications, use cases & occasions, and care\n- "meta_title": an SEO title under 60 characters\n- "meta_description": an SEO description under 160 characters\n- "tags": an array of 6-10 strings\n- "occasion_tags": an array of 3-5 strings\n\nOnly reference variants, dimensions, materials, and pricing supplied in the context. Do not include any text outside the JSON object.`
            ),
          },
        ],
        true,
        2400
      )
      return parseAllJson(text)
    }

    default:
      throw new Error('Unknown AI generation kind.')
  }
}
