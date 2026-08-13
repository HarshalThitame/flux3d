import { describe, expect, it, vi, beforeEach } from 'vitest'

const { generateLinkMock, profileDataMock, updateUserMock } = vi.hoisted(() => ({
  generateLinkMock: vi.fn(),
  profileDataMock: vi.fn(),
  updateUserMock: vi.fn(),
}))

const { ipMock } = vi.hoisted(() => ({
  ipMock: { value: '198.51.100.10' },
}))

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT')
  }),
}))

vi.mock('next/headers', () => ({
  headers: () => new Headers({ 'x-forwarded-for': ipMock.value }),
}))

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: () => ({
    auth: {
      updateUser: updateUserMock,
    },
  }),
}))

vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: () => ({
    auth: {
      admin: {
        generateLink: generateLinkMock,
      },
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          maybeSingle: () => Promise.resolve({ data: profileDataMock() }),
        }),
      }),
    }),
  }),
}))

vi.mock('@/lib/email/triggers', () => ({
  sendWelcomeEmail: vi.fn(() => Promise.resolve()),
  sendEmailVerification: vi.fn(() => Promise.resolve()),
  sendPasswordReset: vi.fn(() => Promise.resolve()),
}))

import { forgotPasswordAction, updatePasswordAction } from '@/app/auth/actions'
import { sendPasswordReset } from '@/lib/email/triggers'
import { redirect } from 'next/navigation'
import { validatePassword } from '@/lib/auth/validation'

function formData(entries: Record<string, string>) {
  const fd = new FormData()
  for (const [key, value] of Object.entries(entries)) {
    fd.set(key, value)
  }
  return fd
}

describe('forgotPasswordAction', () => {
  let emailCounter: number

  beforeEach(() => {
    emailCounter = (emailCounter ?? 0) + 1
    ipMock.value = `10.20.30.${emailCounter}`
    generateLinkMock.mockReset()
    profileDataMock.mockReset()
    vi.mocked(sendPasswordReset).mockReset()
    generateLinkMock.mockResolvedValue({
      data: {
        properties: { action_link: 'https://project.supabase.co/auth/v1/verify?token=abc&type=recovery' },
      },
      error: null,
    })
    profileDataMock.mockReturnValue({ id: 'user-123', full_name: 'Rutik' })
    vi.mocked(sendPasswordReset).mockResolvedValue({ logId: 'log-1' })
  })

  it('rejects an invalid email with a field error', async () => {
    const state = await forgotPasswordAction({}, formData({ email: 'not-an-email', next: '/profile' }))

    expect(state.status).toBe('error')
    expect(state.fieldErrors?.email).toBeDefined()
    expect(generateLinkMock).not.toHaveBeenCalled()
  })

  it('returns generic success and sends the branded reset email', async () => {
    const state = await forgotPasswordAction({}, formData({ email: 'user@example.com', next: '/profile' }))

    expect(state.status).toBe('success')
    expect(state.message).toContain('reset link')
    expect(generateLinkMock).toHaveBeenCalledWith({
      type: 'recovery',
      email: 'user@example.com',
      options: { redirectTo: expect.stringContaining('/auth/callback') },
    })
    expect(sendPasswordReset).toHaveBeenCalledWith(
      'user-123',
      'user@example.com',
      'Rutik',
      expect.stringContaining('type=recovery')
    )
  })

  it('still sends the email when no profile row exists (no silent failure)', async () => {
    profileDataMock.mockReturnValue(null)

    const state = await forgotPasswordAction({}, formData({ email: 'orphan@example.com' }))

    expect(state.status).toBe('success')
    expect(sendPasswordReset).toHaveBeenCalledWith('', 'orphan@example.com', 'User', expect.any(String))
  })

  it('does not reveal account existence when the OTP cannot be generated', async () => {
    generateLinkMock.mockResolvedValue({ data: { properties: null }, error: null })

    const state = await forgotPasswordAction({}, formData({ email: 'ghost@example.com' }))

    expect(state.status).toBe('success')
    expect(sendPasswordReset).not.toHaveBeenCalled()
  })

  it('returns generic success when generateLink throws (e.g. user not found)', async () => {
    generateLinkMock.mockRejectedValue(new Error('User not found'))

    const state = await forgotPasswordAction({}, formData({ email: 'missing@example.com' }))

    expect(state.status).toBe('success')
    expect(sendPasswordReset).not.toHaveBeenCalled()
  })

  it('enforces a 60s cooldown per email without revealing it', async () => {
    const first = await forgotPasswordAction({}, formData({ email: 'cooldown@example.com' }))
    expect(first.status).toBe('success')
    expect(generateLinkMock).toHaveBeenCalledTimes(1)

    const second = await forgotPasswordAction({}, formData({ email: 'cooldown@example.com' }))

    expect(second.status).toBe('success')
    expect(generateLinkMock).toHaveBeenCalledTimes(1)
  })

  it('caps requests per IP per hour', async () => {
    for (let i = 0; i < 21; i += 1) {
      await forgotPasswordAction({}, formData({ email: `ip-user-${i}@example.com` }))
    }

    // 20 allowed, 21st blocked (the rate limit returns the generic success state)
    expect(generateLinkMock).toHaveBeenCalledTimes(20)
  })
})

describe('updatePasswordAction', () => {
  beforeEach(() => {
    updateUserMock.mockReset()
    updateUserMock.mockResolvedValue({ data: { user: {} }, error: null })
    vi.mocked(redirect).mockClear()
  })

  it('rejects a weak password without calling Supabase', async () => {
    const state = await updatePasswordAction({}, formData({ password: 'short' }))

    expect(state.status).toBe('error')
    expect(state.fieldErrors?.password).toBeDefined()
    expect(updateUserMock).not.toHaveBeenCalled()
  })

  it('maps a missing session to a friendly message', async () => {
    updateUserMock.mockResolvedValue({ data: null, error: { message: 'Auth session missing!' } })

    const state = await updatePasswordAction({}, formData({ password: 'ValidPass123!' }))

    expect(state.status).toBe('error')
    expect(state.message).toContain('session has expired')
  })

  it('maps a same-password rejection to a friendly message', async () => {
    updateUserMock.mockResolvedValue({
      data: null,
      error: { message: 'New password should be different from the old password.' },
    })

    const state = await updatePasswordAction({}, formData({ password: 'ValidPass123!' }))

    expect(state.status).toBe('error')
    expect(state.message).toContain('must be different')
  })

  it('hides raw Supabase errors', async () => {
    updateUserMock.mockResolvedValue({ data: null, error: { message: 'something internal happened' } })

    const state = await updatePasswordAction({}, formData({ password: 'ValidPass123!' }))

    expect(state.status).toBe('error')
    expect(state.message).not.toContain('something internal happened')
  })

  it('updates the password and redirects on success', async () => {
    await expect(
      updatePasswordAction({}, formData({ password: 'ValidPass123!', next: '/profile' }))
    ).rejects.toThrow('NEXT_REDIRECT')

    expect(updateUserMock).toHaveBeenCalledWith({ password: 'ValidPass123!' })
    expect(redirect).toHaveBeenCalledWith('/profile')
  })

  it('validates the same password rules as the signup form', () => {
    expect(validatePassword('ValidPass123!').length).toBe(0)
    expect(validatePassword('onlylowercase1!').length).toBeGreaterThan(0)
  })
})
