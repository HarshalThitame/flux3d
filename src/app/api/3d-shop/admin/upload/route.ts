import { NextResponse } from 'next/server'
import { createHash } from 'node:crypto'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const SHOP_BUCKET = 'shop-images'
const MAX_FILE_SIZE = 8 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif'])

function sanitizeFilename(name: string) {
  const fallback = 'image'
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return cleaned || fallback
}

/**
 * Magic-byte sniffing — never trust client MIME. Returns a detected type or
 * null for unknown/unsupported content.
 */
function detectImageType(buffer: Buffer): string | null {
  if (buffer.length < 12) return null
  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'
  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e &&
    buffer[3] === 0x47 && buffer[4] === 0x0d && buffer[5] === 0x0a &&
    buffer[6] === 0x1a && buffer[7] === 0x0a
  ) return 'image/png'
  // GIF: GIF87a / GIF89a
  if (buffer.toString('ascii', 0, 3) === 'GIF') return 'image/gif'
  // WebP: RIFF....WEBP
  if (buffer.toString('ascii', 0, 4) === 'RIFF' && buffer.toString('ascii', 8, 12) === 'WEBP') return 'image/webp'
  return null
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const scope = String(formData.get('scope') || '')
    const productId = String(formData.get('productId') || 'category-banners')
    let reviewUserId: string | null = null
    let adminUserId: string | null = null

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    if (scope === 'review') {
      const authSupabase = await createServerSupabaseClient()
      const { data, error } = await authSupabase.auth.getUser()
      if (error || !data.user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      }
      reviewUserId = data.user.id
    } else {
      const auth = await requireAdminRequest()
      if ('response' in auth) return auth.response
      adminUserId = auth.user?.id ?? null
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, and GIF images are allowed.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Image must be smaller than 8MB.' }, { status: 400 })
    }

    const buffer = Buffer.from(await file.arrayBuffer())
    const detectedType = detectImageType(buffer)
    if (!detectedType || !ALLOWED_TYPES.has(detectedType)) {
      return NextResponse.json(
        { error: 'File content does not look like a supported image (JPEG, PNG, WebP, GIF).' },
        { status: 400 }
      )
    }

    const supabase = createAdminSupabaseClient()

    // Content-hash dedupe — an identical file is reused, never re-uploaded.
    const contentHash = createHash('sha256').update(buffer).digest('hex')
    if (scope !== 'review') {
      const { data: existing } = await supabase
        .from('shelf_media_assets')
        .select('public_url')
        .eq('content_hash', contentHash)
        .limit(1)
        .maybeSingle()
      if (existing?.public_url) {
        return NextResponse.json({ publicUrl: existing.public_url, duplicate: true })
      }
    }
    const safeProductId = productId.replace(/[^a-zA-Z0-9_-]/g, '-')
    const extension = detectedType === 'image/jpeg' ? 'jpg' : detectedType.split('/')[1]
    const path = reviewUserId
      ? `shop/reviews/${reviewUserId}/${Date.now()}-${sanitizeFilename(file.name).replace(/\.[^.]+$/, '')}.${extension}`
      : `shop/products/${safeProductId}/${Date.now()}-${sanitizeFilename(file.name).replace(/\.[^.]+$/, '')}.${extension}`

    const { error: uploadError } = await supabase.storage.from(SHOP_BUCKET).upload(path, buffer, {
      contentType: detectedType,
      cacheControl: '31536000',
      upsert: false,
    })

    if (uploadError) throw new Error(`Upload failed: ${uploadError.message}`)

    const { data } = supabase.storage.from(SHOP_BUCKET).getPublicUrl(path)
    const publicUrl = data.publicUrl

    // Register in the media library (skip review-scope uploads).
    if (!reviewUserId) {
      const { error: registryError } = await supabase.from('shelf_media_assets').insert({
        public_url: publicUrl,
        storage_path: path,
        file_name: file.name.slice(0, 200),
        size_bytes: buffer.length,
        content_hash: contentHash,
        uploaded_by: adminUserId,
      })
      if (registryError) {
        console.warn('media library registration failed:', registryError.message)
      }
    }

    return NextResponse.json({ publicUrl })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
