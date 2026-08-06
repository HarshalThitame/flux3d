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

vi.mock('@/lib/supabase/server', () => {
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
            { id: 'local-1', campaign_id: 'camp-1', status: 'ACTIVE' },
            { id: 'local-2', campaign_id: 'camp-2', status: 'PAUSED' },
          ],
        })
      }
      return makeBuilder({ method: 'limit', result: [] })
    }),
  }

  return {
    createServerClient: () => Promise.resolve(mockClient),
    createServerSupabaseClient: () => Promise.resolve(mockClient),
  }
})

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
  deleteCampaign: vi.fn(() => Promise.resolve({ success: true })),
}))

vi.mock('@/lib/rate-limit', () => ({
  rateLimitResponse: () => Promise.resolve({ success: true, limit: 100, remaining: 99, reset: Date.now() + 60000 }),
}))

vi.mock('@/lib/admin/meta-ads-audit', () => ({
  logMetaAdAudit: vi.fn(() => Promise.resolve()),
}))

vi.mock('@/lib/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

import { POST } from '@/app/api/admin/ads/bulk/archive/route'

describe('POST /api/admin/ads/bulk/archive', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('archives multiple campaigns', async () => {
    const request = new Request('http://localhost/api/admin/ads/bulk/archive', {
      method: 'POST',
      body: JSON.stringify({ ids: ['camp-1', 'camp-2'] }),
    })

    const response = await POST(request) as Response
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.succeeded).toHaveLength(2)
  })

  it('returns 400 when ids exceed limit', async () => {
    const request = new Request('http://localhost/api/admin/ads/bulk/archive', {
      method: 'POST',
      body: JSON.stringify({ ids: Array.from({ length: 101 }, (_, i) => `camp-${i}`) }),
    })

    const response = await POST(request) as Response
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('100')
  })
})
