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
  updateCampaignStatus: vi.fn((id: string) => {
    if (id === 'camp-bad') return Promise.reject(new Error('Meta API error'))
    return Promise.resolve({ success: true })
  }),
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

import { POST } from '@/app/api/admin/ads/bulk/toggle/route'

describe('POST /api/admin/ads/bulk/toggle', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('toggles multiple campaigns in a single request', async () => {
    const request = new Request('http://localhost/api/admin/ads/bulk/toggle', {
      method: 'POST',
      body: JSON.stringify({ ids: ['camp-1', 'camp-2'], status: 'PAUSED' }),
    })

    const response = await POST(request) as Response
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.succeeded).toContain('camp-1')
    expect(body.succeeded).toContain('camp-2')
    expect(body.failed).toHaveLength(0)
  })

  it('returns 400 for invalid status', async () => {
    const request = new Request('http://localhost/api/admin/ads/bulk/toggle', {
      method: 'POST',
      body: JSON.stringify({ ids: ['camp-1'], status: 'INVALID' }),
    })

    const response = await POST(request) as Response
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('ACTIVE')
  })

  it('returns 400 when ids array is empty', async () => {
    const request = new Request('http://localhost/api/admin/ads/bulk/toggle', {
      method: 'POST',
      body: JSON.stringify({ ids: [], status: 'PAUSED' }),
    })

    const response = await POST(request) as Response
    const body = await response.json()

    expect(response.status).toBe(400)
    expect(body.error).toContain('At least one ID')
  })

  it('returns partial success when some toggles fail', async () => {
    const request = new Request('http://localhost/api/admin/ads/bulk/toggle', {
      method: 'POST',
      body: JSON.stringify({ ids: ['camp-good', 'camp-bad'], status: 'PAUSED' }),
    })

    const response = await POST(request) as Response
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(false)
    expect(body.succeeded).toContain('camp-good')
    expect(body.failed).toHaveLength(1)
    expect(body.failed[0].id).toBe('camp-bad')
  })
})
