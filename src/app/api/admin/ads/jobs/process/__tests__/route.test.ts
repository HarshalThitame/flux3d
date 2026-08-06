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

let jobStatus = 'pending'
let existingRecord: Record<string, unknown> | null = null

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn((table: string) => {
      if (table === 'meta_ad_campaigns') {
        return makeBuilder({ method: 'maybeSingle', result: existingRecord })
      }
      if (table === 'meta_ad_campaign_jobs') {
        return makeBuilder({
          method: 'single',
          result: {
            id: 'job-1',
            status: jobStatus,
            payload: { categoryName: 'Test', dailyBudgetPaise: 15000, pageId: 'page-1' },
            created_by: 'user-1',
            attempts: 0,
            max_attempts: 3,
          },
        })
      }
      return makeBuilder({ method: 'limit', result: [] })
    }),
  })),
}))

vi.mock('@upstash/qstash', () => ({
  Receiver: class MockReceiver {
    verify({ signature, body }: { signature: string; body: string }) {
      if (signature === 'valid-sig') return Promise.resolve()
      return Promise.reject(new Error('Invalid signature'))
    }
  },
}))

vi.mock('@/lib/admin/meta-ads-service', () => ({
  createMetaAdCampaign: vi.fn(() => Promise.resolve({
    carousel: { campaignId: 'camp-1', adSetId: 'as-1', creativeId: 'cr-1', adId: 'ad-1' },
    dpa: null,
    cards: [],
    idempotencyKey: 'key-1',
  })),
}))

vi.mock('@/lib/logger', () => ({
  logWarn: vi.fn(),
  logError: vi.fn(),
  logInfo: vi.fn(),
}))

describe('POST /api/admin/ads/jobs/process', () => {
  let POST: (request: Request) => Promise<Response>

  beforeEach(async () => {
    vi.clearAllMocks()
    jobStatus = 'pending'
    existingRecord = null
    const mod = await import('@/app/api/admin/ads/jobs/process/route')
    POST = mod.POST
  })

  it('returns 401 for invalid QStash signature', async () => {
    const request = new Request('http://localhost/api/admin/ads/jobs/process', {
      method: 'POST',
      headers: { 'upstash-signature': 'invalid-sig' },
      body: JSON.stringify({ jobId: 'job-1' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(401)
    const body = await response.json()
    expect(body.error).toContain('Invalid QStash signature')
  })

  it('returns 404 when job is not found', async () => {
    const { createClient } = await import('@supabase/supabase-js')
    vi.mocked(createClient).mockReturnValueOnce({
      from: vi.fn(() => makeBuilder({ method: 'single', result: null, error: { message: 'Not found' } })),
    } as unknown as ReturnType<typeof createClient>)

    const request = new Request('http://localhost/api/admin/ads/jobs/process', {
      method: 'POST',
      headers: { 'upstash-signature': 'valid-sig' },
      body: JSON.stringify({ jobId: 'missing-job' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(404)
  })

  it('returns 409 when job is already processed', async () => {
    jobStatus = 'completed'

    const request = new Request('http://localhost/api/admin/ads/jobs/process', {
      method: 'POST',
      headers: { 'upstash-signature': 'valid-sig' },
      body: JSON.stringify({ jobId: 'job-1' }),
    })

    const response = await POST(request)
    expect(response.status).toBe(409)
    const body = await response.json()
    expect(body.error).toContain('already processed')
  })

  it('completes a job successfully', async () => {
    const { createMetaAdCampaign } = await import('@/lib/admin/meta-ads-service')

    const request = new Request('http://localhost/api/admin/ads/jobs/process', {
      method: 'POST',
      headers: { 'upstash-signature': 'valid-sig' },
      body: JSON.stringify({ jobId: 'job-1' }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.success).toBe(true)
    expect(body.status).toBe('completed')
    expect(createMetaAdCampaign).toHaveBeenCalled()
  })

  it('short-circuits on idempotency hit', async () => {
    existingRecord = { id: 'local-1', campaign_id: 'camp-existing', created_at: '2026-01-01' }

    const request = new Request('http://localhost/api/admin/ads/jobs/process', {
      method: 'POST',
      headers: { 'upstash-signature': 'valid-sig' },
      body: JSON.stringify({ jobId: 'job-1' }),
    })

    const response = await POST(request)
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.status).toBe('completed')
    expect(body.note).toContain('already exists')
  })
})
