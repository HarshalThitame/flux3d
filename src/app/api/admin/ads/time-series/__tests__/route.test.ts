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
  getAdAccountInsightsTimeSeries: vi.fn(() => Promise.resolve([
    { date_start: '2026-08-01', spend: '10.00', impressions: '1000', clicks: '20' },
    { date_start: '2026-08-02', spend: '15.50', impressions: '1500', clicks: '35' },
    { date_start: '2026-08-03', spend: '8.20', impressions: '800', clicks: '15' },
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

describe('GET /api/admin/ads/time-series', () => {
  let GET: (request: Request) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/admin/ads/time-series/route')
    GET = mod.GET
  })

  it('returns chronological chart points', async () => {
    const request = new Request('http://localhost/api/admin/ads/time-series')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.points).toHaveLength(3)
    expect(body.points[0].spend).toBe(10)
    expect(body.points[0].impressions).toBe(1000)
    expect(body.points[0].clicks).toBe(20)
    expect(typeof body.points[0].label).toBe('string')
  })

  it('returns empty points when no data', async () => {
    const { getAdAccountInsightsTimeSeries } = await import('@/lib/meta/marketing-api')
    vi.mocked(getAdAccountInsightsTimeSeries).mockResolvedValueOnce([])

    const request = new Request('http://localhost/api/admin/ads/time-series')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.points).toHaveLength(0)
  })
})
