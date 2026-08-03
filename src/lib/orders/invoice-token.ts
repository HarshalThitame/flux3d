import { timingSafeEqual } from 'node:crypto'
import { createHmac } from 'node:crypto'

// One-time, short-lived token for the /api/receipts/[orderId]/[token].pdf route.
// The token proves authorization to download an order's tax-invoice PDF (used by
// WhatsApp's `document` message fetch) WITHOUT exposing the customer's PII to the
// public internet or persisting the PDF to storage. Format: `<exp>.<hmac>`.

const SECRET =
  process.env.INVOICE_SHARE_SECRET || process.env.SUPABASE_SERVICE_ROLE_KEY || ''

const DEFAULT_TTL_SECONDS = 900 // 15 minutes
const MAX_TTL_SECONDS = 1200 // hard ceiling; rejects oversized windows

function sign(orderId: string, exp: number): string {
  const hmac = createHmac('sha256', SECRET)
  hmac.update(`${orderId}:${exp}`)
  return hmac.digest('hex')
}

export function createInvoiceShareToken(orderId: string, ttlSeconds = DEFAULT_TTL_SECONDS): string {
  if (!SECRET) throw new Error('[invoice-token] INVOICE_SHARE_SECRET/SUPABASE_SERVICE_ROLE_KEY not configured')
  const ttl = Math.min(ttlSeconds, MAX_TTL_SECONDS)
  const exp = Math.floor(Date.now() / 1000) + ttl
  return `${exp}.${sign(orderId, exp)}`
}

export function verifyInvoiceShareToken(orderId: string, token: string): { valid: boolean; expired: boolean } {
  if (!SECRET) return { valid: false, expired: false }
  const [expStr, sig] = token.split('.')
  if (!expStr || !sig) return { valid: false, expired: false }
  const exp = Number(expStr)
  if (!Number.isFinite(exp)) return { valid: false, expired: false }
  const now = Math.floor(Date.now() / 1000)
  const expected = sign(orderId, exp)
  const a = Buffer.from(sig, 'hex')
  const b = Buffer.from(expected, 'hex')
  const ok = a.length === b.length && timingSafeEqual(a, b)
  if (!ok) return { valid: false, expired: false }
  if (exp < now) return { valid: false, expired: true }
  if (exp - now > MAX_TTL_SECONDS) return { valid: false, expired: false } // minted with too-long TTL
  return { valid: true, expired: false }
}
