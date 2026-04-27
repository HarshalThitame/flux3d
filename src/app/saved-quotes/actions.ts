'use server'

import { revalidatePath } from 'next/cache'
import { requireUser } from '@/lib/auth/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'

function readString(formData: FormData, key: string) {
  const value = formData.get(key)
  return typeof value === 'string' ? value.trim() : ''
}

export async function deleteSavedQuoteAction(formData: FormData) {
  const auth = await requireUser('/saved-quotes')
  const supabase = await createServerSupabaseClient()
  const quoteId = Number(readString(formData, 'quoteId'))
  const filePath = readString(formData, 'filePath')
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_QUOTE_BUCKET ?? 'quote-models'

  if (!Number.isInteger(quoteId) || quoteId <= 0) {
    throw new Error('Invalid quote id.')
  }

  const { error } = await supabase
    .from('quotes')
    .delete()
    .eq('id', quoteId)
    .eq('user_id', auth.user.id)

  if (error) {
    throw new Error(error.message)
  }

  if (filePath) {
    const { error: storageError } = await supabase.storage.from(bucket).remove([filePath])

    if (storageError) {
      throw new Error(storageError.message)
    }
  }

  revalidatePath('/saved-quotes')
  revalidatePath('/profile')
}
