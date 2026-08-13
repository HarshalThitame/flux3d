import { describe, expect, it, vi, beforeEach } from 'vitest'
import { NextRequest } from 'next/server'

const { verifyOtpMock, upsertProfileMock } = vi.hoisted(() => ({
  verifyOtpMock: vi.fn(),
  upsertProfileMock: vi.fn(),
}))

vi.mock('@supabase/ssr', () => ({
  createServerClient: vi.fn(() => ({
    auth: {
      verifyOtp: verifyOtpMock,
    },
  })),
}))

vi.mock('@/lib/supabase/config', () => ({
  getSupabasePublishableKey: () => 'anon-key',
  getSupabaseUrl: () => 'https://project.supabase.co',
}))

vi.mock('@/lib/auth/profile', () => ({
  upsertProfileForUser: upsertProfileMock,
}))

import { GET } from '@/app/auth/confirm/route'

function confirmRequest(query: string) {
  return new NextRequest(`https://flux3d.in/auth/confirm${query}`)
}

describe('GET /auth/confirm', () => {
  beforeEach(() => {
    verifyOtpMock.mockReset()
    upsertProfileMock.mockReset()
  })

  it('redirects to login when token_hash or type is missing', async () => {
    const res = await GET(confirmRequest(''))

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login?error=missing_code')
    expect(verifyOtpMock).not.toHaveBeenCalled()
  })

  it('verifies a recovery token and lands on the update-password page', async () => {
    verifyOtpMock.mockResolvedValue({ data: { user: { id: 'u-1' } }, error: null })

    const res = await GET(
      confirmRequest(
        '?token_hash=tokhash-123&type=recovery&next=%2Fauth%2Fupdate-password%3Fnext%3D%252Fprofile'
      )
    )

    expect(verifyOtpMock).toHaveBeenCalledWith({
      type: 'recovery',
      token_hash: 'tokhash-123',
    })
    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain(
      '/auth/update-password?next=%2Fprofile'
    )
    expect(upsertProfileMock).toHaveBeenCalled()
  })

  it('verifies a signup token and lands on the requested page', async () => {
    verifyOtpMock.mockResolvedValue({ data: { user: { id: 'u-2' } }, error: null })

    const res = await GET(
      confirmRequest('?token_hash=signup-hash&type=signup&next=%2Finstant-quote')
    )

    expect(verifyOtpMock).toHaveBeenCalledWith({
      type: 'signup',
      token_hash: 'signup-hash',
    })
    expect(res.headers.get('location')).toContain('/instant-quote')
  })

  it('redirects to login when verification fails', async () => {
    verifyOtpMock.mockResolvedValue({
      data: null,
      error: { message: 'Token has expired or is invalid' },
    })

    const res = await GET(
      confirmRequest(
        '?token_hash=expired&type=recovery&next=%2Fauth%2Fupdate-password'
      )
    )

    expect(res.status).toBe(307)
    expect(res.headers.get('location')).toContain('/login?error=auth_callback_failed')
  })
})
