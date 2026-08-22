import { afterEach, describe, expect, it, vi } from 'vitest'
import { getMetaCapiGatewayOrigins, parseHttpsOrigins } from '@/lib/csp-allowlist'

afterEach(() => {
  vi.unstubAllEnvs()
})

describe('parseHttpsOrigins', () => {
  it('returns an empty list for empty input', () => {
    expect(parseHttpsOrigins(undefined)).toEqual([])
    expect(parseHttpsOrigins(null)).toEqual([])
    expect(parseHttpsOrigins('   ')).toEqual([])
  })

  it('parses whitespace and comma separated origins', () => {
    expect(
      parseHttpsOrigins('https://a.example.com, https://b.run.app\thttps://c.on.aws'),
    ).toEqual(['https://a.example.com', 'https://b.run.app', 'https://c.on.aws'])
  })

  it('normalizes to origins and de-duplicates', () => {
    expect(parseHttpsOrigins('https://a.example.com https://a.example.com')).toEqual([
      'https://a.example.com',
    ])
  })

  it('rejects non-HTTPS schemes', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(parseHttpsOrigins('http://a.example.com ws://a.example.com')).toEqual([])
    expect(warn).toHaveBeenCalledTimes(2)
    warn.mockRestore()
  })

  it('rejects entries with paths, queries, hashes or credentials', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    expect(
      parseHttpsOrigins(
        'https://a.example.com/events https://a.example.com?x=1 https://a.example.com#f ' +
          'https://user:pass@a.example.com not-a-url',
      ),
    ).toEqual([])
    expect(warn).toHaveBeenCalledTimes(5)
    warn.mockRestore()
  })
})

describe('getMetaCapiGatewayOrigins', () => {
  it('includes built-in defaults without configuration', () => {
    vi.stubEnv('NEXT_PUBLIC_META_CAPI_GATEWAY_HOSTS', '')
    const origins = getMetaCapiGatewayOrigins()
    expect(origins).toContain(
      'https://8b-ffbbe167ddcc42afb5f860276d91024e.ecs.us-west-2.on.aws',
    )
    expect(origins).toContain(
      'https://bded8a3c6ae-1-1053047382554.us-central1.run.app',
    )
  })

  it('appends validated env-configured hosts and skips invalid ones', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    vi.stubEnv(
      'NEXT_PUBLIC_META_CAPI_GATEWAY_HOSTS',
      'https://new-gateway.example.com http://bad.example.com',
    )
    const origins = getMetaCapiGatewayOrigins()
    expect(origins).toContain('https://new-gateway.example.com')
    expect(origins).not.toContain('http://bad.example.com')
    expect(warn).toHaveBeenCalledTimes(1)
    warn.mockRestore()
  })
})
