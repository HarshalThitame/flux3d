import { readFile } from 'node:fs/promises'
import path from 'node:path'
import sharp from 'sharp'
import type { BusinessSettings } from '@/lib/admin/business-settings'

const FETCH_TIMEOUT_MS = 6000

// Max display box for the invoice logo is 210x46. Render at 2x for crispness.
const LOGO_MAX_WIDTH = 420
const LOGO_MAX_HEIGHT = 92

function resolveBaseUrl(settings: BusinessSettings): string {
  const explicit = settings.websiteUrl || settings.canonicalUrl
  if (explicit) return explicit.replace(/\/+$/, '')

  const vercelUrl =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL
  if (vercelUrl) {
    return `https://${vercelUrl.replace(/^https?:\/\//, '').replace(/\/+$/, '')}`
  }

  return 'https://flux3d.in'
}

async function fetchLogo(logoUrl: string): Promise<Buffer | null> {
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS)
    try {
      const resp = await fetch(logoUrl, { signal: controller.signal })
      if (!resp.ok) return null
      const buffer = Buffer.from(await resp.arrayBuffer())
      return buffer.length > 0 ? buffer : null
    } finally {
      clearTimeout(timer)
    }
  } catch {
    return null
  }
}

async function readFromPublic(logoUrl: string): Promise<Buffer | null> {
  if (!logoUrl.startsWith('/')) return null
  const filePath = path.join(process.cwd(), 'public', logoUrl.replace(/^\/+/, ''))
  try {
    return await readFile(filePath)
  } catch {
    return null
  }
}

function normalizeLogo(buffer: Buffer): Promise<Buffer | null> {
  return sharp(buffer)
    .metadata()
    .then((meta) => {
      let image = sharp(buffer)
      const needsResize =
        (meta.width ?? 0) > LOGO_MAX_WIDTH ||
        (meta.height ?? 0) > LOGO_MAX_HEIGHT
      if (needsResize) {
        image = image.resize({
          width: Math.min(meta.width ?? LOGO_MAX_WIDTH, LOGO_MAX_WIDTH),
          height: Math.min(meta.height ?? LOGO_MAX_HEIGHT, LOGO_MAX_HEIGHT),
          fit: 'inside',
          withoutEnlargement: true,
        })
      }
      return image.png().toBuffer()
    })
    .catch(() => null)
}

/**
 * Loads the invoice logo and returns a PNG/JPEG buffer ready for PDFKit.
 * PDFKit cannot render WebP/GIF/SVG, so those are converted via sharp.
 * Returns null when no logo is configured or it cannot be loaded/decoded.
 */
export async function loadInvoiceLogo(settings: BusinessSettings): Promise<Buffer | null> {
  const logoValue = settings.invoiceLogoUrl || settings.logoUrl || ''
  if (!logoValue) return null

  let buffer: Buffer | null = null
  if (logoValue.startsWith('http://') || logoValue.startsWith('https://')) {
    buffer = await fetchLogo(logoValue)
  } else {
    buffer = await readFromPublic(logoValue)
    if (!buffer) {
      const baseUrl = resolveBaseUrl(settings)
      buffer = await fetchLogo(`${baseUrl}${logoValue.startsWith('/') ? '' : '/'}${logoValue}`)
    }
  }

  if (!buffer) return null
  return normalizeLogo(buffer)
}