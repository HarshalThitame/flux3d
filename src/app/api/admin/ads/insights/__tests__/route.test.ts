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
  getAdAccountInsights: vi.fn((preset: string) => {
    const base = [
      { spend: '12.50', impressions: '1500', clicks: '45', conversions: '3' },
      { spend: '8.30', impressions: '900', clicks: '22', conversions: '1' },
    ]
    if (preset === 'today') return Promise.resolve(base)
    if (preset === 'last_7d') return Promise.resolve([...base, { spend: '45.00', impressions: '5000', clicks: '120', conversions: '8' }])
    if (preset === 'last_30d') return Promise.resolve([...base, { spend: '120.00', impressions: '15000', clicks: '350', conversions: '25' }])
    return Promise.resolve([])
  }),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitResponse: () => Promise.resolve({ success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 }),
}))

vi.mock('@/lib/logger', () => ({
  logError: vi.fn(),
  logWarn: vi.fn(),
  logInfo: vi.fn(),
}))

describe('GET /api/admin/ads/insights', () => {
  let GET: (request: Request) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/admin/ads/insights/route')
    GET = mod.GET
  })

  it('returns aggregated insights for today, 7d, and 30d', async () => {
    const request = new Request('http://localhost/api/admin/ads/insights')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.today).toBeDefined()
    expect(body.last7d).toBeDefined()
    expect(body.last30d).toBeDefined()
    expect(body.today.spend).toBeGreaterThan(0)
    expect(body.last7d.impressions).toBeGreaterThan(body.today.impressions)
  })

  it('returns 0s when no insights data exists', async () => {
    const { getAdAccountInsights } = await import('@/lib/meta/marketing-api')
    vi.mocked(getAdAccountInsights).mockResolvedValue([])

    const request = new Request('http://localhost/api/admin/ads/insights')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.today.spend).toBe(0)
    expect(body.today.impressions).toBe(0)
    expect(body.today.clicks).toBe(0)
    expect(body.today.conversions).toBe(0)
  })
})
