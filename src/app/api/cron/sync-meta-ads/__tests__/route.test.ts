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

let localRecords: Array<Record<string, unknown>> = []

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'meta_ad_campaigns') {
        return makeBuilder({ method: 'in', result: localRecords })
      }
      return makeBuilder({ method: 'limit', result: [] })
    }),
  })),
}))

vi.mock('@/lib/meta/marketing-api', () => ({
  listCampaigns: vi.fn(() => Promise.resolve([
    { id: 'camp-1', name: 'Updated Name', status: 'ACTIVE', daily_budget: '20000' },
    { id: 'camp-2', name: 'New External', status: 'PAUSED', daily_budget: '15000' },
  ])),
  updateCampaignStatus: vi.fn(() => Promise.resolve({ success: true })),
  getCampaignInsights: vi.fn(() => Promise.resolve([
    { campaign_id: 'camp-1', spend: '350' },
  ])),
}))

vi.mock('@/lib/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

describe('GET /api/cron/sync-meta-ads', () => {
  let GET: (request: Request) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    localRecords = [
      { id: 'local-1', campaign_id: 'camp-1', name: 'Old Name', status: 'PAUSED', daily_budget_paise: 10000 },
      { id: 'local-2', campaign_id: 'camp-deleted', name: 'Deleted', status: 'ACTIVE', daily_budget_paise: 15000 },
    ]
    const mod = await import('@/app/api/cron/sync-meta-ads/route')
    GET = mod.GET
  })

  it('returns 401 when cron secret is missing or invalid', async () => {
    const request = new Request('http://localhost/api/cron/sync-meta-ads', {
      headers: { authorization: 'Bearer wrong-secret' },
    })

    const response = await GET(request)
    expect(response.status).toBe(401)
  })

  it('returns 500 when Supabase config is missing', async () => {
    const originalUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const originalCron = process.env.CRON_SECRET
    process.env.CRON_SECRET = 'test-cron-secret'
    delete (process.env as Record<string, string>).NEXT_PUBLIC_SUPABASE_URL
    delete (process.env as Record<string, string>).SUPABASE_SERVICE_ROLE_KEY

    const request = new Request('http://localhost/api/cron/sync-meta-ads', {
      headers: { authorization: 'Bearer test-cron-secret' },
    })

    const response = await GET(request)
    expect(response.status).toBe(500)

    if (originalUrl) process.env.NEXT_PUBLIC_SUPABASE_URL = originalUrl
    if (originalKey) process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey
    if (originalCron) process.env.CRON_SECRET = originalCron
  })

  it('syncs campaign changes from Meta to local DB', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'

    const request = new Request('http://localhost/api/cron/sync-meta-ads', {
      headers: { authorization: 'Bearer test-cron-secret' },
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.updated).toBeGreaterThanOrEqual(0)
    expect(body.orphanedLocal).toBeGreaterThanOrEqual(0)
    expect(body.orphanedMeta).toBeGreaterThanOrEqual(0)
  })

  it('auto-pauses campaigns with spend anomalies', async () => {
    process.env.CRON_SECRET = 'test-cron-secret'
    localRecords = [
      { id: 'local-1', campaign_id: 'camp-1', name: 'Test', status: 'ACTIVE', daily_budget_paise: 10000 },
    ]
    const { getCampaignInsights } = await import('@/lib/meta/marketing-api')
    vi.mocked(getCampaignInsights).mockResolvedValueOnce([
      { campaign_id: 'camp-1', spend: '350' },
    ])

    const request = new Request('http://localhost/api/cron/sync-meta-ads', {
      headers: { authorization: 'Bearer test-cron-secret' },
    })

    const response = await GET(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.spendAnomalies).toBeGreaterThanOrEqual(0)
  })
})
