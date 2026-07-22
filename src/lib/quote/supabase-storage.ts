'use client'

import {
  isMissingSupabaseTableError,
  QUOTES_TABLE_UNAVAILABLE_MESSAGE,
} from '@/lib/quote/supabase-errors'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { trackFeatureUsage } from '@/lib/tracking/featureTracker'
import type { QuoteConfig, UploadState } from '@/lib/quote/types'

const MAX_FILE_SIZE_MB = 50
const ALLOWED_EXTENSIONS = ['stl', 'step', 'obj', '3mf', 'dxf', 'dwg']

function getExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

export function validateModelFile(file: File) {
  const extension = getExtension(file.name)

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return `Unsupported format ".${extension}". Please upload a 3D model file (STL, OBJ, 3MF, STEP, DXF, or DWG).`
  }

  if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
    return `File is too large. Maximum allowed size is ${MAX_FILE_SIZE_MB}MB.`
  }

  return null
}

export async function uploadFileToSupabaseStorage(
  file: File,
  userId: string,
  quoteId: string,
  onProgress: (progress: number) => void
): Promise<UploadState> {
  onProgress(5)

  const urlResponse = await fetch('/api/quote/upload-url', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileName: file.name, fileSize: file.size, quoteId }),
  })

  if (!urlResponse.ok) {
    const body = await urlResponse.json().catch(() => ({ error: 'Failed to initialize upload.' }))
    throw new Error(body.error || 'Failed to initialize upload.')
  }

  const { signedUrl, path } = (await urlResponse.json()) as {
    signedUrl: string
    path: string
    extension: string
  }

  onProgress(15)

  await new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('PUT', signedUrl)
    xhr.setRequestHeader('Content-Type', 'application/octet-stream')

    xhr.upload.onprogress = (event) => {
      if (event.lengthComputable) {
        const pct = Math.round(15 + (event.loaded / event.total) * 75)
        onProgress(pct)
      }
    }

    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress(90)
        resolve()
      } else {
        reject(new Error(`Upload failed (HTTP ${xhr.status}).`))
      }
    }

    xhr.onerror = () => reject(new Error('Upload failed due to a network error.'))
    xhr.onabort = () => reject(new Error('Upload was aborted.'))
    xhr.send(file)
  })

  onProgress(100)

  void trackFeatureUsage(userId, 'stl_uploaded', {
    quoteId,
    fileName: file.name,
    extension: path.split('.').pop() ?? '',
    sizeBytes: file.size,
    path,
  }).catch(() => {})

  return {
    status: 'success',
    progress: 100,
    path,
  }
}

export async function getSignedModelUrl(path: string): Promise<string> {
  const response = await fetch(`/api/quote/upload?path=${encodeURIComponent(path)}`)
  if (!response.ok) {
    throw new Error('Could not retrieve model preview URL.')
  }
  const data = (await response.json()) as { signedUrl: string }
  return data.signedUrl
}

export async function saveQuoteToSupabase(payload: {
  userId: string
  quoteId: string
  name: string
  email: string
  phone: string
  filePath?: string
  config: QuoteConfig
  notes?: string
  estimate: {
    total: number
    estimatedHours: number
    dimensions: { x: number; y: number; z: number }
  }
}) {
  const supabase = getSupabaseBrowserClient()
  const serializedMessage = JSON.stringify(payload)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError) {
    if (authError.code === 'refresh_token_not_found') {
      throw new Error('Session expired. Please log in again.')
    }
    throw new Error(authError.message)
  }

  if (!user) {
    throw new Error('You must be logged in to save quotes.')
  }

  const { error } = await supabase.from('quotes').insert({
    user_id: user.id,
    quote_id: payload.quoteId,
    name: payload.name,
    email: payload.email,
    phone: payload.phone,
    file_path: payload.filePath ?? null,
    config: payload.config,
    estimate: payload.estimate,
    notes: payload.notes ?? null,
    message: serializedMessage,
  })

  if (error) {
    if (isMissingSupabaseTableError(error, 'quotes')) {
      throw new Error(QUOTES_TABLE_UNAVAILABLE_MESSAGE)
    }

    throw new Error(error.message)
  }

  if (payload.filePath) {
    const fileName = payload.filePath.split('/').pop() || `${payload.quoteId}.stl`
    await supabase.from('model_files').upsert(
      {
        user_id: user.id,
        file_name: fileName,
        file_url: payload.filePath,
        material: payload.config.materialId,
        status: 'quoted',
        uploaded_at: new Date().toISOString(),
      },
      { onConflict: 'user_id,file_url' }
    )
  }
}
