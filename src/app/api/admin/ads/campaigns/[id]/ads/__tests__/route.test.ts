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
    return makeBuilder({ method: 'limit', result: [] })
  }),
}

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => Promise.resolve(mockClient),
  createServerClient: () => Promise.resolve(mockClient),
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

vi.mock('@/lib/meta/marketing-api', () => ({
  listAds: vi.fn(() => Promise.resolve([
    { id: 'ad-1', name: 'Ad One', status: 'ACTIVE' },
    { id: 'ad-2', name: 'Ad Two', status: 'PAUSED' },
  ])),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitResponse: () => Promise.resolve({ success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 }),
}))

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}))

describe('GET /api/admin/ads/campaigns/[id]/ads', () => {
  let GET: (request: Request, ctx: { params: Promise<{ id: string }> }) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/admin/ads/campaigns/[id]/ads/route')
    GET = mod.GET
  })

  it('returns ads for a given ad set id', async () => {
    const request = new Request('http://localhost/api/admin/ads/campaigns/adset-1/ads')
    const response = await GET(request, { params: Promise.resolve({ id: 'adset-1' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ads).toHaveLength(2)
    expect(body.ads[0].id).toBe('ad-1')
  })

  it('returns empty array when no ads exist', async () => {
    const { listAds } = await import('@/lib/meta/marketing-api')
    vi.mocked(listAds).mockResolvedValueOnce([])

    const request = new Request('http://localhost/api/admin/ads/campaigns/adset-1/ads')
    const response = await GET(request, { params: Promise.resolve({ id: 'adset-1' }) })
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.ads).toHaveLength(0)
  })
})
