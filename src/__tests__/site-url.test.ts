import { afterEach, describe, expect, it, vi } from 'vitest'
import { normalizeSiteUrl } from '@/lib/site'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('site url resolver', () => {
  it('rejects localhost values in production', () => {
    vi.stubEnv('NODE_ENV', 'production')

    expect(normalizeSiteUrl('http://localhost:3000')).toBe('https://flux3d.in')
    expect(normalizeSiteUrl('localhost:3000')).toBe('https://flux3d.in')
  })

  it('keeps localhost values in development', () => {
    vi.stubEnv('NODE_ENV', 'development')

    expect(normalizeSiteUrl('http://localhost:3000')).toBe('http://localhost:3000')
  })
})
