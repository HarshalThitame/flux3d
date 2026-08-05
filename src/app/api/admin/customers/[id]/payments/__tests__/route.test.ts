import { beforeEach, describe, expect, it, vi } from 'vitest'

const supabaseFromMock = vi.fn()

function makeChainableBuilder() {
  const builder: Record<string, ReturnType<typeof vi.fn>> = {
    select: vi.fn(() => builder),
    eq: vi.fn(() => builder),
    in: vi.fn(() => builder),
    order: vi.fn(() => builder),
    limit: vi.fn(() => Promise.resolve({ data: [], error: null })),
  }
  return builder
}

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({ from: supabaseFromMock }),
}))

vi.mock('@/lib/admin/server', () => ({
  createAdminSupabaseClient: () => ({ from: supabaseFromMock }),
}))

vi.mock('@/lib/admin/request', () => ({
  requireAdminRequest: vi.fn().mockResolvedValue({ supabase: {}, user: { id: 'admin-1' } }),
}))

vi.mock('@/lib/admin/api', () => ({
  getAdminApiErrorResponse: (error: Error) =>
    new Response(JSON.stringify({ error: error.message }), { status: 500, headers: { 'Content-Type': 'application/json' } }),
}))

import { GET } from '@/app/api/admin/customers/[id]/payments/route'

describe('GET /api/admin/customers/[id]/payments', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns payments with refund totals per attempt', async () => {
    const attempts = [
      {
        id: 'pay-1',
        internal_order_type: 'order',
        internal_order_id: 'order-42',
        amount_paise: 500000,
        currency: 'INR',
        provider: 'razorpay',
        payment_purpose: 'order',
        status: 'captured',
        payment_method: 'upi',
        attempt_number: 1,
        receipt: 'RCP-1',
        metadata: { orderNumber: 'ORD-100' },
        created_at: '2026-07-01T10:00:00Z',
        captured_at: '2026-07-01T10:05:00Z',
      },
      {
        id: 'pay-2',
        internal_order_type: 'order',
        internal_order_id: 'order-42',
        amount_paise: 500000,
        currency: 'INR',
        provider: 'razorpay',
        payment_purpose: 'order',
        status: 'failed',
        payment_method: 'card',
        attempt_number: 2,
        receipt: 'RCP-2',
        metadata: {},
        created_at: '2026-07-01T11:00:00Z',
        captured_at: null,
      },
    ]
    const refunds = [
      { payment_attempt_id: 'pay-1', status: 'processed', amount_paise: 150000 },
      { payment_attempt_id: 'pay-1', status: 'failed', amount_paise: 350000 },
    ]

    const builder = makeChainableBuilder()
    builder.limit = vi.fn(() => Promise.resolve({ data: attempts, error: null }))
    const refundBuilder = makeChainableBuilder()
    refundBuilder.order = vi.fn(() => Promise.resolve({ data: refunds, error: null }))
    builder.in = vi.fn(() => refundBuilder)
    supabaseFromMock.mockReturnValue(builder)

    const response = await GET(new Request('http://localhost/api/admin/customers/user-1/payments'), {
      params: Promise.resolve({ id: 'user-1' }),
    }) as Response
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.payments).toHaveLength(2)

    const first = body.payments[0]
    expect(first).toMatchObject({
      id: 'pay-1',
      orderNumber: 'ORD-100',
      amountPaise: 500000,
      status: 'captured',
      currency: 'INR',
    })
    // Only processed/pending refunds count toward the refunded total.
    expect(first.refundedAmountPaise).toBe(150000)

    const second = body.payments[1]
    expect(second.orderNumber).toBe('order-42')
    expect(second.refundedAmountPaise).toBe(0)
  })

  it('skips the refunds query when there are no attempts', async () => {
    const builder = makeChainableBuilder()
    builder.limit = vi.fn(() => Promise.resolve({ data: [], error: null }))
    supabaseFromMock.mockReturnValue(builder)

    const response = await GET(new Request('http://localhost/api/admin/customers/user-1/payments'), {
      params: Promise.resolve({ id: 'user-1' }),
    }) as Response
    const body = await response.json()

    expect(response.status).toBe(200)
    expect(body.payments).toEqual([])
    expect(builder.in).not.toHaveBeenCalled()
  })

  it('propagates query errors as 500', async () => {
    const builder = makeChainableBuilder()
    builder.limit = vi.fn(() => Promise.resolve({ data: null, error: { message: 'db down' } }))
    supabaseFromMock.mockReturnValue(builder)

    const response = await GET(new Request('http://localhost/api/admin/customers/user-1/payments'), {
      params: Promise.resolve({ id: 'user-1' }),
    }) as Response
    const body = await response.json()

    expect(response.status).toBe(500)
    expect(body.error).toBe('db down')
  })
})
