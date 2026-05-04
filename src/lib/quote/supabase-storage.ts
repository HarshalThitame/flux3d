'use client'

import {
  isMissingSupabaseTableError,
  QUOTES_TABLE_UNAVAILABLE_MESSAGE,
} from '@/lib/quote/supabase-errors'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { QuoteConfig, UploadState } from '@/lib/quote/types'

const MAX_FILE_SIZE_MB = 50
const ALLOWED_EXTENSIONS = ['stl', 'step', 'obj', '3mf', 'dxf', 'dwg']

function getExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? ''
}

function getMimeType(extension: string) {
  switch (extension) {
    case 'stl':
      return 'model/stl'
    case 'obj':
      return 'text/plain'
    case '3mf':
      return 'model/3mf'
    default:
      return 'application/octet-stream'
  }
}

export function validateModelFile(file: File) {
  const extension = getExtension(file.name)

  if (!ALLOWED_EXTENSIONS.includes(extension)) {
    return 'Unsupported format. Please upload STL, OBJ, or 3MF.'
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
  const supabase = getSupabaseBrowserClient()
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? 'quote-models'

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
    throw new Error('You must be logged in to upload model files.')
  }

  const extension = getExtension(file.name)
  const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.\-_]/g, '-')
  const objectPath = `${user.id}/${quoteId}/${Date.now()}-${sanitizedFileName}`

  onProgress(15)

  const { error } = await supabase.storage.from(bucket).upload(objectPath, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || getMimeType(extension),
  })

   if (error) {
    // Log full error details for debugging 42704
    console.error('Storage upload error (raw):', error)
    console.error('Error message:', error.message)
    console.error('Error stringified:', JSON.stringify(error, Object.getOwnPropertyNames(error)))
    console.error('Error keys:', Object.keys(error))
    
    throw new Error(`Storage upload failed: ${error.message}`)
  }

  onProgress(100)

  return {
    status: 'success',
    progress: 100,
    path: objectPath,
  }
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
}
