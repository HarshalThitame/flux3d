import { Redis } from '@upstash/redis'

export type RateLimitResult = {
  success: boolean
  limit: number
  remaining: number
  reset: number
}

type InMemoryBucket = {
  count: number
  resetAt: number
}

const inMemoryStore = new Map<string, InMemoryBucket>()

function getRedisClient(): Redis | null {
  const url = process.env.UPSTASH_REDIS_REST_URL
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
  if (!url || !token) return null
  return new Redis({ url, token })
}

function cleanExpiredBuckets(now: number) {
  for (const [key, bucket] of inMemoryStore.entries()) {
    if (bucket.resetAt < now) {
      inMemoryStore.delete(key)
    }
  }
}

function slidingWindowInMemory(key: string, windowSeconds: number, maxRequests: number): RateLimitResult {
  const now = Date.now()
  cleanExpiredBuckets(now)

  const bucketKey = `${key}:${Math.floor(now / (windowSeconds * 1000))}`
  const previousBucketKey = `${key}:${Math.floor(now / (windowSeconds * 1000)) - 1}`

  const current = inMemoryStore.get(bucketKey) ?? { count: 0, resetAt: now + windowSeconds * 1000 }
  const previous = inMemoryStore.get(previousBucketKey)

  const previousWeight = Math.max(0, 1 - (now % (windowSeconds * 1000)) / (windowSeconds * 1000))
  const weightedCount = current.count + (previous?.count ?? 0) * previousWeight

  const success = weightedCount < maxRequests
  if (success) {
    current.count += 1
    current.resetAt = now + windowSeconds * 1000
    inMemoryStore.set(bucketKey, current)
  }

  return {
    success,
    limit: maxRequests,
    remaining: Math.max(0, Math.floor(maxRequests - weightedCount - 1)),
    reset: current.resetAt,
  }
}

async function slidingWindowRedis(
  redis: Redis,
  key: string,
  windowSeconds: number,
  maxRequests: number
): Promise<RateLimitResult> {
  const now = Date.now()
  const windowStart = Math.floor((now - windowSeconds * 1000) / 1000)
  const nowSeconds = Math.floor(now / 1000)

  const multi = redis.pipeline()
  multi.zremrangebyscore(key, 0, windowStart)
  multi.zcard(key)
  multi.zadd(key, { score: nowSeconds, member: `${nowSeconds}:${crypto.randomUUID()}` })
  multi.pexpire(key, windowSeconds * 1000 + 1000)

  const results = await multi.exec<{ score: number; member: string }[]>()
  const count = (results[1] as unknown as number) ?? 0
  const success = count < maxRequests

  return {
    success,
    limit: maxRequests,
    remaining: Math.max(0, maxRequests - count - 1),
    reset: now + windowSeconds * 1000,
  }
}

export async function rateLimitCheck(
  key: string,
  windowSeconds: number,
  maxRequests: number
): Promise<RateLimitResult> {
  const redis = getRedisClient()
  if (redis) {
    return slidingWindowRedis(redis, `rate_limit:${key}`, windowSeconds, maxRequests)
  }
  return slidingWindowInMemory(key, windowSeconds, maxRequests)
}

export function buildRateLimitKey(request: Request, prefix: string, userId?: string): string {
  const forwarded = request.headers.get('x-forwarded-for')
  const ip = forwarded?.split(',')[0]?.trim() ?? 'unknown'
  const parts = [prefix]
  if (userId) parts.push(userId)
  parts.push(ip)
  return parts.join(':')
}

export async function rateLimitResponse(
  request: Request,
  options: {
    prefix: string
    windowSeconds: number
    maxRequests: number
    userId?: string
  }
): Promise<RateLimitResult> {
  const key = buildRateLimitKey(request, options.prefix, options.userId)
  return rateLimitCheck(key, options.windowSeconds, options.maxRequests)
}
