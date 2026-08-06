import { NextResponse } from 'next/server'
import { requireAdminRequest } from '@/lib/admin/request'
import { rateLimitResponse } from '@/lib/rate-limit'
import { logError, logWarn } from '@/lib/logger'
import { ZodError, type ZodSchema } from 'zod'

export async function requireMetaAdsAuth(
  request: Request,
  options?: { rateLimit?: { prefix: string; windowSeconds: number; maxRequests: number } }
) {
  // Rate limiting first
  if (options?.rateLimit) {
    const rl = await rateLimitResponse(request, {
      prefix: options.rateLimit.prefix,
      windowSeconds: options.rateLimit.windowSeconds,
      maxRequests: options.rateLimit.maxRequests,
    })
    if (!rl.success) {
      logWarn('Rate limit exceeded for meta ads route', {
        module: 'meta-ads',
        metadata: { prefix: options.rateLimit.prefix, remaining: rl.remaining },
      })
      return {
        response: NextResponse.json(
          { error: 'Rate limit exceeded. Please slow down.' },
          { status: 429, headers: { 'Retry-After': String(Math.ceil((rl.reset - Date.now()) / 1000)) } }
        ),
      }
    }
  }

  // Admin auth
  const auth = await requireAdminRequest()
  if ('response' in auth) {
    return { response: auth.response as Response }
  }

  return { user: auth.user, supabase: auth.supabase }
}

export function validateBody<T>(schema: ZodSchema<T>, body: unknown): { success: true; data: T } | { success: false; error: string; issues: ZodError['issues'] } {
  const result = schema.safeParse(body)
  if (!result.success) {
    const issues = result.error.issues
    const message = issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ')
    return { success: false, error: message, issues }
  }
  return { success: true, data: result.data }
}
