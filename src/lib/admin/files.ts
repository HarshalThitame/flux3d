import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getSupabaseUrl } from '@/lib/supabase/config'

const QUOTE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? 'quote-models'

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

function isTrustedSupabaseStorageUrl(value: string) {
  try {
    const url = new URL(value)
    const supabaseUrl = new URL(getSupabaseUrl())
    const bucketPattern = new RegExp(
      `^/storage/v1/object/(?:public|sign)/${QUOTE_BUCKET.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}/`
    )

    return url.origin === supabaseUrl.origin && bucketPattern.test(url.pathname)
  } catch {
    return false
  }
}

export async function getAdminOrderFileDownloadUrl(fileUrl: string) {
  const trimmed = fileUrl.trim()

  if (!trimmed) {
    throw new Error('Order file is missing.')
  }

  if (isAbsoluteUrl(trimmed)) {
    if (!isTrustedSupabaseStorageUrl(trimmed)) {
      throw new Error('Unsupported file URL.')
    }
    return trimmed
  }

  if (trimmed.includes('://') || trimmed.startsWith('/') || trimmed.includes('..')) {
    throw new Error('Invalid file path.')
  }

  const supabase = createAdminSupabaseClient()
  const fileName = trimmed.split('/').pop() ?? 'model-file'
  const { data, error } = await supabase.storage
    .from(QUOTE_BUCKET)
    .createSignedUrl(trimmed, 60, {
      download: fileName,
    })

  if (error) {
    throw new Error(error.message)
  }

  if (!data.signedUrl) {
    throw new Error('Could not create a download link for this file.')
  }

  return data.signedUrl
}
