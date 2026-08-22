/**
 * CSP origin allow-list helpers.
 *
 * Meta's Conversions API (CAPI) Gateway assigns one or more first-party relay
 * hosts per ad account (e.g. `https://<hash>.ecs.<region>.on.aws` or a
 * Cloud Run URL). fbevents.js discovers these automatically at runtime and
 * sends browser events to `<host>/events`, so they must be present in
 * `connect-src` or every pixel event is dropped by the browser.
 *
 * Because gateway hosts can change when Meta re-provisions them, they are
 * sourced from an environment variable instead of being hard-coded:
 *
 *   NEXT_PUBLIC_META_CAPI_GATEWAY_HOSTS="https://a.example.com https://b.run.app"
 *
 * Entries are whitespace/comma separated, validated as strict HTTPS origins
 * and de-duplicated. Invalid entries are dropped with a warning so a typo can
 * never produce a malformed or weakened CSP (e.g. no wildcards, no http:,
 * no paths, no credentials).
 */

export const META_CAPI_GATEWAY_HOSTS_ENV = 'NEXT_PUBLIC_META_CAPI_GATEWAY_HOSTS'

/** Known-good fallbacks for this project's current Meta CAPI Gateway relays. */
const DEFAULT_CAPI_GATEWAY_ORIGINS = [
  'https://8b-ffbbe167ddcc42afb5f860276d91024e.ecs.us-west-2.on.aws',
  'https://bded8a3c6ae-1-1053047382554.us-central1.run.app',
] as const

function warnInvalidCspOrigin(raw: string): void {
  console.warn(
    `[csp-allowlist] Ignoring invalid ${META_CAPI_GATEWAY_HOSTS_ENV} entry: "${raw}". ` +
      'Expected an HTTPS origin such as "https://host.example.com".',
  )
}

/**
 * Parses a raw allow-list string into normalized, validated HTTPS origins.
 * Never throws; unsafe or malformed entries are skipped so callers always get
 * a safe list to embed into the Content-Security-Policy header.
 */
export function parseHttpsOrigins(raw: string | undefined | null): string[] {
  if (!raw || !raw.trim()) return []

  const origins = new Set<string>()
  const entries = raw.split(/[\s,]+/).filter(Boolean)

  for (const entry of entries) {
    let url: URL
    try {
      url = new URL(entry)
    } catch {
      warnInvalidCspOrigin(entry)
      continue
    }

    // Strict origin rules: HTTPS only, no path/query/hash, no credentials.
    if (
      url.protocol !== 'https:' ||
      (url.pathname && url.pathname !== '/') ||
      url.search ||
      url.hash ||
      url.username ||
      url.password
    ) {
      warnInvalidCspOrigin(entry)
      continue
    }

    origins.add(url.origin)
  }

  return [...origins]
}

/**
 * Returns the Meta CAPI Gateway origins allowed by `connect-src`, combining
 * the environment configuration with the built-in defaults.
 */
export function getMetaCapiGatewayOrigins(): string[] {
  return [
    ...DEFAULT_CAPI_GATEWAY_ORIGINS,
    ...parseHttpsOrigins(process.env[META_CAPI_GATEWAY_HOSTS_ENV]),
  ]
}
