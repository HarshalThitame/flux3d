import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

const SHOP_BUCKET = 'shop-images'
const MAX_FILE_SIZE = 8 * 1024 * 1024
const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/svg+xml'])

function sanitizeFilename(name: string) {
  const fallback = 'image'
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return cleaned || fallback
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const scope = String(formData.get('scope') || '')
    const productId = String(formData.get('productId') || 'category-banners')
    let reviewUserId: string | null = null

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
    }

    if (!ALLOWED_TYPES.has(file.type)) {
      return NextResponse.json({ error: 'Only JPEG, PNG, WebP, GIF, and SVG images are allowed.' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Image must be smaller than 8MB.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const safeProductId = productId.replace(/[^a-zA-Z0-9_-]/g, '-')
    const path = reviewUserId
      ? `shop/reviews/${reviewUserId}/${Date.now()}-${sanitizeFilename(file.name)}`
      : `shop/products/${safeProductId}/${Date.now()}-${sanitizeFilename(file.name)}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage.from(SHOP_BUCKET).upload(path, buffer, {
      contentType: file.type,
      cacheControl: '31536000',
      upsert: false,
    })

    if (uploadError) {
      if (uploadError.message.toLowerCase().includes('bucket')) {
        const { error: bucketError } = await supabase.storage.createBucket(SHOP_BUCKET, {
          public: true,
          fileSizeLimit: MAX_FILE_SIZE,
        })
        if (bucketError) throw new Error(`Storage setup failed: ${bucketError.message}`)

        const { error: retryError } = await supabase.storage.from(SHOP_BUCKET).upload(path, buffer, {
          contentType: file.type,
          cacheControl: '31536000',
          upsert: false,
        })
        if (retryError) throw new Error(`Upload failed: ${retryError.message}`)
      } else {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }
    }

    const { data } = supabase.storage.from(SHOP_BUCKET).getPublicUrl(path)
    return NextResponse.json({ publicUrl: data.publicUrl })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
