import OpenAI from 'openai'

function getClassifierModel(): string {
  return process.env.WHATSAPP_CLASSIFIER_MODEL?.trim() || 'gpt-4o-mini'
}

function getClassifierOpenAI() {
  const key = process.env.OPENAI_API_KEY
  if (!key) return null
  return new OpenAI({ apiKey: key })
}

export type ClassifiedIntent = {
  intent: 'pricing' | 'shipping' | 'order' | 'materials' | 'contact' | 'greeting' | 'general' | 'out_of_scope'
  keywords: string[]
}

const VALID_INTENTS = ['pricing', 'shipping', 'order', 'materials', 'contact', 'greeting', 'general', 'out_of_scope']

const SYSTEM_PROMPT = `You are an intent classifier for a 3D printing business.
Classify the user message into exactly one of these intents:
- pricing: asking about cost, price, quote, fees, budget
- shipping: asking about delivery, courier, dispatch, tracking, pincode
- order: asking about existing order status, order number, invoice
- materials: asking about print materials (PLA, ABS, PETG, resin, etc.), colors, finishes
- contact: asking for phone, address, support, business hours
- greeting: hello, hi, hey, good morning
- out_of_scope: not related to 3D printing or the business
- general: anything else related to 3D printing services

Also extract 2-5 important keywords from the message that identify specific products, materials, or numbers.

Return ONLY valid JSON with no markdown:
{ "intent": "...", "keywords": [...] }`

export async function classifyIntent(message: string): Promise<ClassifiedIntent> {
  const client = getClassifierOpenAI()
  if (!client) {
    return { intent: 'general', keywords: [] }
  }

  try {
    const response = await client.chat.completions.create({
      model: getClassifierModel(),
      temperature: 0,
      max_tokens: 100,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: message.slice(0, 1000) },
      ],
      response_format: { type: 'json_object' },
    })

    const content = response.choices[0]?.message?.content
    if (!content) {
      return { intent: 'general', keywords: [] }
    }

    const parsed = JSON.parse(content)
    return {
      intent: validateIntent(parsed.intent),
      keywords: Array.isArray(parsed.keywords)
        ? parsed.keywords.filter((k: unknown): k is string => typeof k === 'string')
        : [],
    }
  } catch {
    return { intent: 'general', keywords: [] }
  }
}

function validateIntent(value: unknown): ClassifiedIntent['intent'] {
  if (typeof value === 'string' && VALID_INTENTS.includes(value)) {
    return value as ClassifiedIntent['intent']
  }
  return 'general'
}
