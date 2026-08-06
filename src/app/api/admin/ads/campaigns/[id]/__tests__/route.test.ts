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
        return makeBuilder({ method: 'maybeSingle', result: { id: 'local-1', name: 'Old Name', daily_budget_paise: 10000, status: 'ACTIVE' } })
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
  getCampaignDetails: vi.fn(() => Promise.resolve({ id: 'camp-1', name: 'Test Campaign', objective: 'OUTCOME_SALES' })),
  updateCampaignBudget: vi.fn(() => Promise.resolve({ success: true })),
  updateCampaignName: vi.fn(() => Promise.resolve({ success: true })),
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

import { GET, PUT, DELETE } from '@/app/api/admin/ads/campaigns/[id]/route'

describe('/api/admin/ads/campaigns/[id]', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET', () => {
    it('returns campaign details', async () => {
      const request = new Request('http://localhost/api/admin/ads/campaigns/camp-1')
      const response = await GET(request as any, { params: Promise.resolve({ id: 'camp-1' }) }) as Response
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.campaign.id).toBe('camp-1')
    })
  })

  describe('PUT', () => {
    it('updates campaign name and budget', async () => {
      const request = new Request('http://localhost/api/admin/ads/campaigns/camp-1', {
        method: 'PUT',
        body: JSON.stringify({ name: 'New Name', dailyBudgetPaise: 20000 }),
      })

      const response = await PUT(request as any, { params: Promise.resolve({ id: 'camp-1' }) }) as Response
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
    })

    it('rejects budget below minimum', async () => {
      const request = new Request('http://localhost/api/admin/ads/campaigns/camp-1', {
        method: 'PUT',
        body: JSON.stringify({ dailyBudgetPaise: 1000 }),
      })

      const response = await PUT(request as any, { params: Promise.resolve({ id: 'camp-1' }) }) as Response
      const body = await response.json()

      expect(response.status).toBe(400)
      expect(body.error).toContain('Minimum daily budget')
    })
  })

  describe('DELETE', () => {
    it('archives campaign and updates local record', async () => {
      const request = new Request('http://localhost/api/admin/ads/campaigns/camp-1', { method: 'DELETE' })
      const response = await DELETE(request as any, { params: Promise.resolve({ id: 'camp-1' }) }) as Response
      const body = await response.json()

      expect(response.status).toBe(200)
      expect(body.success).toBe(true)
    })
  })
})
