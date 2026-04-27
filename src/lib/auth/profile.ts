import type { SupabaseClient, User } from '@supabase/supabase-js'

function getProfileName(user: User, fallbackName?: string) {
  const metadataName =
    typeof user.user_metadata.full_name === 'string'
      ? user.user_metadata.full_name
      : typeof user.user_metadata.name === 'string'
        ? user.user_metadata.name
        : null

  return fallbackName?.trim() || metadataName || user.email?.split('@')[0] || 'Flux3D User'
}

function getAvatarUrl(user: User) {
  if (typeof user.user_metadata.avatar_url === 'string') {
    return user.user_metadata.avatar_url
  }

  if (typeof user.user_metadata.picture === 'string') {
    return user.user_metadata.picture
  }

  return null
}

export async function upsertProfileForUser(
  supabase: SupabaseClient,
  user: User,
  fallbackName?: string
) {
  const { error } = await supabase.from('profiles').upsert(
    {
      id: user.id,
      email: user.email,
      name: getProfileName(user, fallbackName),
      avatar_url: getAvatarUrl(user),
    },
    {
      onConflict: 'id',
    }
  )

  if (error) {
    throw new Error(error.message)
  }
}
