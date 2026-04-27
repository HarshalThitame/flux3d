type SupabaseLikeError = {
  code?: string | null
  message?: string | null
}

export function isMissingSupabaseTableError(
  error: SupabaseLikeError | null | undefined,
  table: string
) {
  if (!error) {
    return false
  }

  return (
    error.code === 'PGRST205' ||
    error.message?.includes(`Could not find the table 'public.${table}'`) === true
  )
}

export const QUOTES_TABLE_UNAVAILABLE_MESSAGE =
  'Saved quotes are not available yet because the Supabase quotes table has not been set up.'
