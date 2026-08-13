import { describe, expect, it, vi, beforeEach } from 'vitest'

const { headerValues } = vi.hoisted(() => ({
  headerValues: { 'x-forwarded-for': '203.0.113.42', 'user-agent': '' },
}))

vi.mock('next/headers', () => ({
  headers: () => new Headers(headerValues),
}))

import { getClientIp, getDeviceInfo, formatChangedAt } from '@/lib/auth/request-context'

describe('getClientIp', () => {
  beforeEach(() => {
    headerValues['x-forwarded-for'] = '203.0.113.42'
  })

  it('returns the first forwarded IP', async () => {
    expect(await getClientIp()).toBe('203.0.113.42')
  })

  it('ignores downstream proxy hops', async () => {
    headerValues['x-forwarded-for'] = '198.51.100.7, 10.0.0.1, 10.0.0.2'
    expect(await getClientIp()).toBe('198.51.100.7')
  })

  it('falls back to unknown', async () => {
    headerValues['x-forwarded-for'] = ''
    expect(await getClientIp()).toBe('unknown')
  })
})

describe('getDeviceInfo', () => {
  beforeEach(() => {
    headerValues['user-agent'] = ''
  })

  it('parses Chrome on Windows', async () => {
    headerValues['user-agent'] =
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/126.0.0.0 Safari/537.36'
    expect(await getDeviceInfo()).toBe('Chrome on Windows')
  })

  it('parses Safari on iOS', async () => {
    headerValues['user-agent'] =
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 Safari/604.1'
    expect(await getDeviceInfo()).toBe('Safari on iOS')
  })

  it('parses Chrome on Android', async () => {
    headerValues['user-agent'] =
      'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/125.0 Mobile Safari/537.36'
    expect(await getDeviceInfo()).toBe('Chrome (Mobile) on Android')
  })

  it('parses Firefox on macOS', async () => {
    headerValues['user-agent'] = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10.15; rv:127.0) Gecko/20100101 Firefox/127.0'
    expect(await getDeviceInfo()).toBe('Firefox on macOS')
  })

  it('falls back when the user-agent is missing', async () => {
    expect(await getDeviceInfo()).toBe('Unknown device')
  })
})

describe('formatChangedAt', () => {
  it('formats a timestamp in IST', () => {
    const date = new Date('2026-08-13T12:00:00.000Z')
    expect(formatChangedAt(date)).toBe('13 Aug 2026, 05:30 pm')
  })
})
