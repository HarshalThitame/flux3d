/**
 * Classifier for WhatsApp Cloud API (Graph) error responses.
 *
 * The API returns errors as { error: { code, error_subcode, message, ... } }
 * with varying HTTP statuses. Treating them all identically either wastes
 * retries on permanent failures or gives up on transient ones.
 *
 * Key codes:
 *   190 / HTTP 401      — access token expired or invalid
 *   130429 / 80004 / 429 — app-level rate limit (throttle; retryable)
 *   4 / 613 / 9 / 80001 — Meta throttles (retryable)
 *   131047              — re-engagement required (outside 24h window; needs
 *                         a template message, retrying will never succeed)
 *   470 / 131030        — recipient invalid / not on WhatsApp
 *   132000..132012      — template parameter issues
 */

export type GraphErrorKind =
  | 'auth'
  | 'throttle'
  | 'reengagement'
  | 'recipient'
  | 'template'
  | 'unknown'

export type ClassifiedGraphError = {
  kind: GraphErrorKind
  code: number | null
  message: string
  /** Safe to retry with backoff */
  retryable: boolean
}

const THROTTLE_CODES = new Set([4, 613, 9, 80001, 130429, 80004])
const REENGAGEMENT_CODES = new Set([131047, 131048])
const RECIPIENT_CODES = new Set([470, 131030, 131026])
const TEMPLATE_CODE_MIN = 132_000
const TEMPLATE_CODE_MAX = 132_012

export function classifyGraphError(
  status: number,
  body: string,
): ClassifiedGraphError {
  let code: number | null = null
  let apiMessage = ''
  try {
    const parsed = JSON.parse(body) as {
      error?: { code?: number; message?: string; error_subcode?: number }
    }
    if (typeof parsed?.error?.code === 'number') code = parsed.error.code
    if (typeof parsed?.error?.message === 'string') apiMessage = parsed.error.message
  } catch {
    apiMessage = body.slice(0, 300)
  }

  const base = { code, message: apiMessage || body.slice(0, 300) }

  // HTTP status takes priority for auth/throttle signals
  if (status === 401 || status === 403 || code === 190) {
    return {
      ...base,
      kind: 'auth',
      message:
        code === 190 || status === 401
          ? 'WhatsApp access token expired or invalid — rotate the system user token'
          : base.message,
      retryable: false,
    }
  }

  if (status === 429 || THROTTLE_CODES.has(code ?? -1)) {
    return { ...base, kind: 'throttle', retryable: true }
  }

  if (REENGAGEMENT_CODES.has(code ?? -1)) {
    return { ...base, kind: 'reengagement', retryable: false }
  }

  if (RECIPIENT_CODES.has(code ?? -1)) {
    return { ...base, kind: 'recipient', retryable: false }
  }

  if (
    code !== null &&
    code >= TEMPLATE_CODE_MIN &&
    code <= TEMPLATE_CODE_MAX
  ) {
    return { ...base, kind: 'template', retryable: false }
  }

  return { ...base, kind: 'unknown', retryable: status >= 500 }
}
