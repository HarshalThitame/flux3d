import { createAdminSupabaseClient } from '@/lib/admin/server'

const SHOP_BUCKET = 'shop-images'

/**
 * Best-effort deletion of a shop-images storage object given its public URL.
 * Never throws — orphan cleanup must not fail the caller's main operation.
 * Returns true when an object was removed.
 */
export async function deleteShopImageAsset(publicUrl: string | null | undefined): Promise<boolean> {
  if (!publicUrl) return false
  try {
    const supabase = createAdminSupabaseClient()
    const { data } = supabase.storage.from(SHOP_BUCKET).getPublicUrl('')
    const prefix = data.publicUrl
    if (!publicUrl.startsWith(prefix)) return false

    const objectPath = decodeURIComponent(publicUrl.slice(prefix.length)).replace(/^\/+/, '')
    if (!objectPath || objectPath.includes('..')) return false

    const { error } = await supabase.storage.from(SHOP_BUCKET).remove([objectPath])
    if (error) {
      console.warn('shop-images cleanup failed:', error.message)
      return false
    }
    return true
  } catch (error) {
    console.warn('shop-images cleanup failed:', error instanceof Error ? error.message : error)
    return false
  }
}
