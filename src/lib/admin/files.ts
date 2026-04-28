import { createAdminSupabaseClient } from '@/lib/admin/server'

const QUOTE_BUCKET = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? 'quote-models'

function isAbsoluteUrl(value: string) {
  return /^https?:\/\//i.test(value)
}

export async function getAdminOrderFileDownloadUrl(fileUrl: string) {
  const trimmed = fileUrl.trim()

  if (!trimmed) {
    throw new Error('Order file is missing.')
  }

  if (isAbsoluteUrl(trimmed)) {
    return trimmed
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
