// ============================================================================
// Email Attachment Storage Helpers
// ============================================================================
// Interacts with the Supabase Storage 'email-attachments' bucket.
//   - listEmailAttachments()
//   - uploadEmailAttachment(file, filename)
//   - deleteEmailAttachment(filename)
//   - fetchAttachmentBase64(filename)
//
// Bucket is flat (no folders). Files are stored as `public/{filename}`.
// ============================================================================

import { createAdminClient } from '@/lib/supabase/admin'

const BUCKET = 'email-attachments'

export async function listEmailAttachments(): Promise<
  { name: string; size: number; createdAt: string; url: string }[]
> {
  const supabase = createAdminClient()
  const { data, error } = await supabase.storage.from(BUCKET).list('')

  if (error) {
    console.error('[email-attachments] List error:', error.message)
    throw new Error(error.message)
  }

  const files = (data ?? []).filter((f) => f.id !== undefined)
  return files.map((f) => {
    const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(f.name)
    return {
      name: f.name,
      size: f.metadata?.size ?? 0,
      createdAt: f.created_at ?? '',
      url: urlData?.publicUrl ?? '',
    }
  })
}

export async function uploadEmailAttachment(
  file: File | Buffer,
  filename: string
): Promise<{ path: string; url: string }> {
  const supabase = createAdminClient()

  // Prevent path traversal
  const safeName = filename.replace(/[/\\]/g, '_').trim()
  if (!safeName) throw new Error('Invalid filename')

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .upload(safeName, file, {
      upsert: true,
      contentType: guessContentType(safeName),
    })

  if (error) {
    console.error('[email-attachments] Upload error:', error.message)
    throw new Error(error.message)
  }

  const { data: urlData } = supabase.storage.from(BUCKET).getPublicUrl(data.path)
  return { path: data.path, url: urlData.publicUrl }
}

export async function deleteEmailAttachment(filename: string): Promise<void> {
  const supabase = createAdminClient()
  const safeName = filename.replace(/[/\\]/g, '_').trim()
  const { error } = await supabase.storage.from(BUCKET).remove([safeName])
  if (error) {
    console.error('[email-attachments] Delete error:', error.message)
    throw new Error(error.message)
  }
}

export async function fetchAttachmentBase64(
  filename: string
): Promise<{ filename: string; content: string; contentType: string } | null> {
  const supabase = createAdminClient()
  const safeName = filename.replace(/[/\\]/g, '_').trim()

  const { data, error } = await supabase.storage
    .from(BUCKET)
    .download(safeName)

  if (error || !data) {
    console.warn(`[email-attachments] Failed to download ${safeName}:`, error?.message)
    return null
  }

  const buffer = await data.arrayBuffer()
  const base64 = Buffer.from(buffer).toString('base64')
  const contentType = data.type || guessContentType(safeName)

  return { filename: safeName, content: base64, contentType }
}

function guessContentType(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase()
  switch (ext) {
    case 'pdf':
      return 'application/pdf'
    case 'jpg':
    case 'jpeg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'webp':
      return 'image/webp'
    default:
      return 'application/octet-stream'
  }
}
