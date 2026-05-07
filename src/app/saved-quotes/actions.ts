'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { normalizeOwnedStoragePath } from '@/lib/quote/storage-path'

function readString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function deleteSavedQuoteAction(formData: FormData) {
  const auth = await requireUser('/saved-quotes')
  const supabase = await createServerSupabaseClient()
  const quoteId = Number(readString(formData, 'quoteId'))
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? 'quote-models'

  if (!Number.isInteger(quoteId) || quoteId <= 0) {
    throw new Error('Invalid quote id.')
  }

  const { data: quote, error: quoteError } = await supabase
    .from('quotes')
    .select('file_path')
    .eq('id', quoteId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (quoteError) {
    throw new Error(quoteError.message)
  }

  if (!quote) {
    throw new Error('Quote not found.')
  }

  if (quote.file_path) {
    const safeFilePath = normalizeOwnedStoragePath(quote.file_path, auth.user.id)
    const { error: storageError } = await supabase.storage.from(bucket).remove([safeFilePath])

    if (storageError) {
      throw new Error(storageError.message)
    }
  }

  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId)
    .eq('user_id', auth.user.id)

  if (error) {
    throw new Error(error.message)
  }

  revalidatePath('/saved-quotes')
  revalidatePath('/profile')
}
