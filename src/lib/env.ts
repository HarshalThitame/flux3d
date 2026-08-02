import { z } from 'zod'

const envSchema = z.object({
  // Supabase
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),

  // OpenAI
  OPENAI_API_KEY: z.string().min(1).optional(),

  // WhatsApp
  WHATSAPP_PHONE_NUMBER_ID: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),
  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_WEBHOOK_SECRET: z.string().optional(),
  WHATSAPP_AUTH_TEMPLATE_NAME: z.string().optional(),

  // WhatsApp ordering
  WHATSAPP_ORDERING_ENABLED: z.enum(['true', 'false']).default('true'),
  WHATSAPP_ORDER_EXPIRY_MINUTES: z.coerce.number().int().positive().default(60),

  // WhatsApp AI tuning
  WHATSAPP_OPENAI_MODEL: z.string().default('gpt-4.1-mini'),
  WHATSAPP_API_VERSION: z.string().default('v22.0'),
  WHATSAPP_CLASSIFIER_MODEL: z.string().default('gpt-4o-mini'),
  WHATSAPP_EMBEDDING_MODEL: z.string().default('text-embedding-3-small'),
  WHATSAPP_REPLY_TO_ALL: z.enum(['true', 'false']).default('true'),
  WHATSAPP_RAG_ENABLED: z.enum(['true', 'false']).default('true'),
  WHATSAPP_RAG_TOP_K: z.coerce.number().int().positive().default(4),
  WHATSAPP_RAG_MIN_SCORE: z.coerce.number().min(0).max(1).default(0.3),
  WHATSAPP_RAG_CONFIDENCE_THRESHOLD: z.coerce.number().min(0).max(1).default(0.55),
  WHATSAPP_SESSION_TURNS: z.coerce.number().int().positive().default(4),
  WHATSAPP_STRUCTURED_DATA_ENABLED: z.enum(['true', 'false']).default('true'),

  // Meta Commerce
  NEXT_PUBLIC_META_PIXEL_ID: z.string().min(1).optional(),
  META_SYSTEM_USER_TOKEN: z.string().min(1).optional(),
  META_CATALOG_ID: z.string().min(1).optional(),
  META_APP_ID: z.string().min(1).optional(),
  META_BUSINESS_ID: z.string().optional(),
  META_CAPI_USER_AGENT: z.string().optional(),

  // Cron
  CRON_SECRET: z.string().optional(),

  // Sentry
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
})

type EnvVars = z.infer<typeof envSchema>

let validatedEnv: EnvVars | null = null
let validationError: string | null = null

export function getEnv(): EnvVars {
  if (validatedEnv) return validatedEnv
  if (validationError) throw new Error(`Environment validation failed: ${validationError}`)

  const result = envSchema.safeParse(process.env)
  if (!result.success) {
    const issues = result.error.issues as Array<{ code: string; path: (string | number)[]; message: string; received?: string }>
    const missing = issues
      .filter((i) => i.code === 'invalid_type' && i.received === 'undefined')
      .map((i) => i.path.join('.'))
    const others = issues
      .filter((i) => !(i.code === 'invalid_type' && i.received === 'undefined'))
      .map((i) => `${i.path.join('.')}: ${i.message}`)

    const message = [
      missing.length > 0 ? `Missing required env vars: ${missing.join(', ')}` : '',
      others.length > 0 ? `Invalid env vars: ${others.join('; ')}` : '',
    ].filter(Boolean).join('. ')

    validationError = message
    throw new Error(`Environment validation failed: ${message}`)
  }

  validatedEnv = result.data
  return result.data
}

export function clearEnvCache() {
  validatedEnv = null
  validationError = null
}
