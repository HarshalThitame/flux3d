import { beforeEach, describe, expect, it, vi } from 'vitest'

function makeBuilder(terminal: { method: string; result: unknown; error?: unknown }) {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => builder),
    maybeSingle: vi.fn(() => builder),
    single: vi.fn(() => builder),
    insert: vi.fn(() => builder),
    update: vi.fn(() => builder),
  }
  if (builder[terminal.method]) {
    builder[terminal.method] = vi.fn(() => Promise.resolve({ data: terminal.result, error: terminal.error ?? null }))
  }
  return builder
}

const mockClient = {
  auth: {
    getUser: () => Promise.resolve({ data: { user: { id: 'admin-1' } }, error: null }),
  },
  from: vi.fn((table: string) => {
    if (table === 'profiles') {
      return makeBuilder({ method: 'single', result: { is_admin: true } })
    }
    if (table === 'meta_ad_campaign_jobs') {
      return makeBuilder({ method: 'single', result: { id: 'job-123' } })
    }
    return makeBuilder({ method: 'limit', result: [] })
  }),
}

vi.mock('@/lib/supabase/server', () => ({
  createServerClient: () => Promise.resolve(mockClient),
  createServerSupabaseClient: () => Promise.resolve(mockClient),
}))

vi.mock('@/lib/admin/server', () => ({
  createAdminSupabaseClient: () => ({
    from: vi.fn((table: string) => {
      if (table === 'profiles') {
        return makeBuilder({ method: 'maybeSingle', result: { is_admin: true } })
      }
      return makeBuilder({ method: 'limit', result: [] })
    }),
  }),
}))

let qstashShouldFail = false

vi.mock('@/lib/email/qstash', () => ({
  getQStashClient: () => ({
    publishJSON: vi.fn(() => {
      if (qstashShouldFail) return Promise.reject(new Error('QStash down'))
      return Promise.resolve({ messageId: 'msg-123' })
    }),
  }),
}))

let rateLimitShouldBlock = false
let rateLimitResult = { success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 }

vi.mock('@/lib/rate-limit', () => ({
  rateLimitResponse: () => {
    if (rateLimitShouldBlock) {
      return Promise.resolve({ success: false, limit: 5, remaining: 0, reset: Date.now() + 60000 })
    }
    return Promise.resolve(rateLimitResult)
  },
}))

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}))

describe('POST /api/admin/ads/create-async', () => {
  let POST: (request: Request) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/admin/ads/create-async/route')
    POST = mod.POST
  })

  it('enqueues a campaign creation job and returns jobId', async () => {
    const request = new Request('http://localhost/api/admin/ads/create-async', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryName: '3D Printed Home Decor',
        dailyBudgetPaise: 15000,
        createDpa: true,
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.jobId).toBe('job-123')
    expect(body.status).toBe('pending')
    expect(body.pollUrl).toBe('/api/admin/ads/jobs/job-123')
  })

  it('returns 400 for invalid body', async () => {
    const request = new Request('http://localhost/api/admin/ads/create-async', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryName: '' }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('Category name')
  })

  it('returns 429 when rate limited', async () => {
    rateLimitShouldBlock = true

    const request = new Request('http://localhost/api/admin/ads/create-async', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ categoryName: 'Test', dailyBudgetPaise: 15000 }),
    })

    const response = await POST(request)
    expect(response.status).toBe(429)

    rateLimitShouldBlock = false
  })

  it('marks job as failed when QStash enqueue fails', async () => {
    qstashShouldFail = true

    const request = new Request('http://localhost/api/admin/ads/create-async', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        categoryName: '3D Printed Home Decor',
        dailyBudgetPaise: 15000,
      }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.jobId).toBe('job-123')
    expect(body.status).toBe('pending')

    qstashShouldFail = false
  })
})
