import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

const SHOP_BUCKET = 'shop-images'
const MAX_FILE_SIZE = 50 * 1024 * 1024

const ALLOWED_EXTENSIONS = new Set(['glb', 'gltf', 'stl', 'obj', '3mf'])
const REJECTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/svg+xml',
  'video/mp4',
  'video/webm',
  'video/quicktime',
  'audio/mpeg',
  'audio/wav',
  'audio/ogg',
  'application/pdf',
  'text/html',
  'application/x-zip-compressed',
  'application/zip',
])

function getFileExtension(name: string) {
  const match = name.split('.').pop()
  return match ? match.toLowerCase() : ''
}

function sanitizeFilename(name: string) {
  const fallback = 'model'
  const cleaned = name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '')

  return cleaned || fallback
}

export async function POST(request: Request) {
  const auth = await requireAdminRequest()
  if ('response' in auth) return auth.response

  try {
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    const productId = String(formData.get('productId') || 'unknown')

    if (!file) {
      return NextResponse.json({ error: 'No file provided.' }, { status: 400 })
    }

    const extension = getFileExtension(file.name)
    if (!ALLOWED_EXTENSIONS.has(extension)) {
      return NextResponse.json(
        { error: 'Only GLB, GLTF, STL, OBJ, and 3MF model files are allowed.' },
        { status: 400 }
      )
    }

    if (file.type && REJECTED_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: 'Only GLB, GLTF, STL, OBJ, and 3MF model files are allowed.' },
        { status: 400 }
      )
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'Model must be smaller than 50MB.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const safeProductId = productId.replace(/[^a-zA-Z0-9_-]/g, '-')
    const path = `shop/models/${safeProductId}/${Date.now()}-${sanitizeFilename(file.name)}`
    const buffer = Buffer.from(await file.arrayBuffer())

    const { error: uploadError } = await supabase.storage.from(SHOP_BUCKET).upload(path, buffer, {
      contentType: file.type || 'application/octet-stream',
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
          contentType: file.type || 'application/octet-stream',
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
