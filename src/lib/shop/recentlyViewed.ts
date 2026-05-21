export type RecentlyViewedShopProduct = {
  id: string
  name: string
  slug: string
  thumbnail_url: string | null
  base_price: number
}

const STORAGE_KEY = 'flux3d_shop_recently_viewed'
const MAX_ITEMS = 8

function canUseLocalStorage() {
  return typeof window !== 'undefined' && Boolean(window.localStorage)
}

function normalizeProduct(product: RecentlyViewedShopProduct): RecentlyViewedShopProduct {
  return {
    id: String(product.id),
    name: String(product.name),
    slug: String(product.slug),
    thumbnail_url: product.thumbnail_url || null,
    base_price: Number(product.base_price) || 0,
  }
}

export function getRecentlyViewed(): RecentlyViewedShopProduct[] {
  if (!canUseLocalStorage()) return []

  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((item): item is RecentlyViewedShopProduct => Boolean(item?.id && item?.name && item?.slug))
      .map(normalizeProduct)
      .slice(0, MAX_ITEMS)
  } catch {
    return []
  }
}

export function addRecentlyViewed(product: RecentlyViewedShopProduct) {
  if (!canUseLocalStorage()) return

  const normalized = normalizeProduct(product)
  const next = [
    normalized,
    ...getRecentlyViewed().filter((item) => item.id !== normalized.id),
  ].slice(0, MAX_ITEMS)

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
}
