import { NextResponse } from 'next/server'
import { getAdminApiErrorResponse } from '@/lib/admin/api'
import { requireAdminRequest } from '@/lib/admin/request'
import { createAdminSupabaseClient } from '@/lib/admin/server'

const SHOP_BUCKET = 'shop-images'
const MAX_FILE_SIZE = 50 * 1024 * 1024

const ASSET_KINDS = {
  model: { extensions: new Set(['glb', 'gltf', 'stl', 'obj', '3mf']), label: 'GLB, GLTF, STL, OBJ, and 3MF model files', folder: 'models' },
  usdz: { extensions: new Set(['usdz']), label: 'USDZ files', folder: 'ar' },
  video: { extensions: new Set(['mp4', 'webm']), label: 'MP4 and WebM video files', folder: 'videos' },
} as const

type AssetKind = keyof typeof ASSET_KINDS

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

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
    const body = await request.json()
    const { fileName, fileSize, productId } = body

    if (!fileName || !productId) {
      return NextResponse.json(
        { error: 'Missing required fields: fileName, productId' },
        { status: 400 }
      )
    }

    const kind: AssetKind = (body.kind && body.kind in ASSET_KINDS ? body.kind : 'model') as AssetKind
    const assetKind = ASSET_KINDS[kind]

    const extension = getFileExtension(fileName)
    if (!assetKind.extensions.has(extension)) {
      return NextResponse.json(
        { error: `Only ${assetKind.label} are allowed.` },
        { status: 400 }
      )
    }

    if (typeof fileSize === 'number' && fileSize > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'File must be smaller than 50MB.' }, { status: 400 })
    }

    const supabase = createAdminSupabaseClient()
    const safeProductId = String(productId).replace(/[^a-zA-Z0-9_-]/g, '-')
    const objectPath = `shop/${assetKind.folder}/${safeProductId}/${Date.now()}-${sanitizeFilename(fileName)}`

    const { data: buckets } = await supabase.storage.listBuckets()
    const bucketExists = buckets?.some((b) => b.name === SHOP_BUCKET)
    if (!bucketExists) {
      const { error: bucketError } = await supabase.storage.createBucket(SHOP_BUCKET, {
        public: true,
        fileSizeLimit: MAX_FILE_SIZE,
      })
      if (bucketError) throw new Error(`Storage setup failed: ${bucketError.message}`)
    }

    const { data: uploadUrlData, error: uploadUrlError } = await supabase.storage
      .from(SHOP_BUCKET)
      .createSignedUploadUrl(objectPath)

    if (uploadUrlError) {
      throw new Error(`Failed to create upload URL: ${uploadUrlError.message}`)
    }

    const { data: publicUrlData } = supabase.storage
      .from(SHOP_BUCKET)
      .getPublicUrl(objectPath)

    return NextResponse.json({
      signedUrl: uploadUrlData.signedUrl,
      path: uploadUrlData.path,
      publicUrl: publicUrlData.publicUrl,
    })
  } catch (error) {
    return getAdminApiErrorResponse(error)
  }
}
