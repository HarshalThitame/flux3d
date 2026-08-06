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
    if (table === 'meta_ad_campaigns') {
      return makeBuilder({
        method: 'in',
        result: [
          { id: 'local-1', campaign_id: 'camp-1', name: 'Test Campaign' },
        ],
      })
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
  listCampaigns: vi.fn(() => Promise.resolve([
    { id: 'camp-1', name: 'Test Campaign', objective: 'OUTCOME_SALES', status: 'ACTIVE', effective_status: 'ACTIVE', created_time: '2026-01-01T00:00:00Z', updated_time: '2026-01-01T00:00:00Z' },
    { id: 'camp-2', name: 'Other Campaign', objective: 'OUTCOME_AWARENESS', status: 'PAUSED', effective_status: 'PAUSED', created_time: '2026-01-02T00:00:00Z', updated_time: '2026-01-02T00:00:00Z' },
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

describe('GET /api/admin/ads/list', () => {
  let GET: (request: Request) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    const mod = await import('@/app/api/admin/ads/list/route')
    GET = mod.GET
  })

  it('returns campaigns enriched with local records', async () => {
    const request = new Request('http://localhost/api/admin/ads/list')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.campaigns).toHaveLength(2)
    expect(body.total).toBe(2)
    expect(body.campaigns[0].has_local_record).toBe(true)
    expect(body.campaigns[1].has_local_record).toBe(false)
  })

  it('returns empty list when no campaigns exist', async () => {
    const { listCampaigns } = await import('@/lib/meta/marketing-api')
    vi.mocked(listCampaigns).mockResolvedValueOnce([])

    const request = new Request('http://localhost/api/admin/ads/list')
    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.campaigns).toHaveLength(0)
    expect(body.total).toBe(0)
  })
})
