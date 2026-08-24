'use client'

import type { AuthChangeEvent, Session } from '@supabase/supabase-js'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import {
  clearServerCart,
  deleteServerCartLine,
  fetchLiveShopSkus,
  getAuthUserId,
  insertServerCartLine,
  loadServerCart,
  updateServerCartLine,
  type LiveSkuSnapshot,
  type NewServerCartLine,
  type ServerCartLine,
} from '@/lib/cart/server-cart'
import { useShopCartStore, type ShopCartItem } from '@/stores/shopCartStore'

let initStarted = false
let lastHydratedUserId: string | null = null

function clampQuantity(quantity: number, maxStock: number) {
  const upper = Math.max(1, maxStock || 1)
  return Math.min(Math.max(1, Math.floor(quantity)), upper)
}

function buildVariantLabel(combination: Record<string, string | boolean>) {
  return Object.entries(combination)
    .map(([key, value]) => `${key}: ${value}`)
    .join(', ')
}

function sameEntry(line: ServerCartLine, item: Pick<ShopCartItem, 'skuId' | 'customizationText'>) {
  return (
    line.sku_id === item.skuId &&
    String(line.payload?.customizationText ?? '').trim() === item.customizationText.trim()
  )
}

function lineToShopItem(line: ServerCartLine, live?: LiveSkuSnapshot): ShopCartItem {
  const payload = (line.payload ?? {}) as Record<string, unknown>
  const variantCombination = (payload.variantCombination ?? {}) as Record<string, string | boolean>
  const stockSource = live ? Math.max(1, live.stockQuantity) : Number(payload.maxStock ?? 1)
  const quantity = clampQuantity(Number(line.quantity ?? 1), stockSource)

  return {
    cartItemId: line.id,
    productId: (line.product_id as string) || String(payload.productId ?? ''),
    productSlug: String(payload.productSlug ?? ''),
    productName: String(payload.productName ?? ''),
    categoryId: (payload.categoryId as string | null) ?? null,
    categoryName: (payload.categoryName as string | null) ?? null,
    categorySlug: (payload.categorySlug as string | null) ?? null,
    thumbnail: String(payload.thumbnail ?? ''),
    skuId: String(line.sku_id ?? payload.skuId ?? ''),
    skuCode: String(payload.skuCode ?? ''),
    variantCombination,
    variantLabel: String(payload.variantLabel || buildVariantLabel(variantCombination)),
    customizationText: String(payload.customizationText ?? '').trim(),
    price: Number(live ? live.price : payload.price ?? 0),
    compareAtPrice: live
      ? live.compareAtPrice
      : ((payload.compareAtPrice as number | null) ?? null),
    quantity,
    maxStock: stockSource,
    weightGrams: live ? live.weightGrams : Number(payload.weightGrams ?? 0),
    available: live ? live.isAvailable : true,
  }
}

function shopItemToLine(userId: string, item: ShopCartItem): NewServerCartLine {
  return {
    user_id: userId,
    cart_type: 'shop',
    sku_id: item.skuId,
    product_id: item.productId || null,
    quantity: clampQuantity(item.quantity, item.maxStock),
    estimated_cost: Number((item.price * item.quantity).toFixed(2)),
    weight_grams: item.weightGrams ? Math.round(item.weightGrams * item.quantity) : null,
    payload: {
      productId: item.productId,
      productSlug: item.productSlug,
      productName: item.productName,
      categoryId: item.categoryId ?? null,
      categoryName: item.categoryName ?? null,
      categorySlug: item.categorySlug ?? null,
      thumbnail: item.thumbnail,
      skuCode: item.skuCode,
      variantCombination: item.variantCombination,
      variantLabel: item.variantLabel,
      customizationText: item.customizationText.trim(),
      price: item.price,
      compareAtPrice: item.compareAtPrice,
      maxStock: item.maxStock,
      weightGrams: item.weightGrams ?? 0,
    },
  }
}

function applyHydratedItems(nextItems: ShopCartItem[]) {
  const state = useShopCartStore.getState()
  const previousByLineId = new Map(state.items.map((item) => [item.cartItemId, item]))
  const changedIds = nextItems
    .filter((item) => {
      const previous = previousByLineId.get(item.cartItemId)
      return previous != null && Math.abs(previous.price - item.price) > 0.001
    })
    .map((item) => item.cartItemId)

  useShopCartStore.setState({
    items: nextItems,
    priceChangedItemIds: Array.from(new Set([...state.priceChangedItemIds, ...changedIds])),
  })
}

async function hydrateFromServerLines(lines: ServerCartLine[]) {
  const skuIds = Array.from(new Set(lines.map((line) => line.sku_id).filter((id): id is string => Boolean(id))))
  let liveMap = new Map<string, LiveSkuSnapshot>()
  try {
    liveMap = await fetchLiveShopSkus(skuIds)
  } catch (error) {
    console.warn('[shop-cart] Live price fetch failed, using snapshots', error)
  }

  const items = lines.map((line) =>
    lineToShopItem(line, line.sku_id ? liveMap.get(line.sku_id) : undefined)
  )
  applyHydratedItems(items)
}

export async function adoptServerShopCart(userId: string) {
  if (lastHydratedUserId === userId && !useShopCartStore.getState().isSyncing) {
    return
  }

  useShopCartStore.setState({ isSyncing: true })
  try {
    let lines = await loadServerCart(userId, 'shop')

    const localOnlyItems = useShopCartStore.getState().items.filter((item) => item.localOnly)
    if (localOnlyItems.length > 0) {
      for (const local of localOnlyItems) {
        const match = lines.find((line) => sameEntry(line, local))
        if (!match) {
          const inserted = await insertServerCartLine(shopItemToLine(userId, local))
          lines = [...lines, inserted]
        } else if (match.quantity < local.quantity) {
          await updateServerCartLine(match.id, {
            quantity: local.quantity,
            estimated_cost: Number((local.price * local.quantity).toFixed(2)),
          })
          match.quantity = local.quantity
        }
      }
      await hydrateFromServerLines(lines)
    } else {
      await hydrateFromServerLines(lines)
    }

    lastHydratedUserId = userId
  } finally {
    useShopCartStore.setState({ isSyncing: false })
  }
}

export async function refreshShopCartFromServer() {
  const userId = await getAuthUserId()
  if (!userId) return

  if (lastHydratedUserId !== userId) {
    await adoptServerShopCart(userId)
    return
  }

  useShopCartStore.setState({ isSyncing: true })
  try {
    const lines = await loadServerCart(userId, 'shop')
    await hydrateFromServerLines(lines)
  } catch (error) {
    console.warn('[shop-cart] Refresh failed', error)
  } finally {
    useShopCartStore.setState({ isSyncing: false })
  }
}

export function mirrorShopAdd(item: ShopCartItem) {
  void (async () => {
    const userId = await getAuthUserId()
    if (!userId) return
    const lines = await loadServerCart(userId, 'shop')
    const match = lines.find((line) => sameEntry(line, item))
    if (match) {
      const quantity = clampQuantity(match.quantity + item.quantity, item.maxStock)
      await updateServerCartLine(match.id, {
        quantity,
        estimated_cost: Number((item.price * quantity).toFixed(2)),
      })
    } else {
      const inserted = await insertServerCartLine(shopItemToLine(userId, item))
      useShopCartStore.setState((state) => ({
        items: state.items.map((cartItem) =>
          cartItem.localOnly &&
          cartItem.skuId === item.skuId &&
          cartItem.customizationText === item.customizationText
            ? { ...cartItem, cartItemId: inserted.id, localOnly: false }
            : cartItem
        ),
      }))
    }
  })().catch((error) => console.warn('[shop-cart] Add sync failed', error))
}

export function mirrorShopRemove(cartItemId: string) {
  void deleteServerCartLine(cartItemId).catch((error) =>
    console.warn('[shop-cart] Remove sync failed', error)
  )
}

export function mirrorShopQuantity(cartItemId: string, quantity: number, unitPrice: number) {
  void updateServerCartLine(cartItemId, {
    quantity,
    estimated_cost: Number((unitPrice * quantity).toFixed(2)),
  }).catch((error) => console.warn('[shop-cart] Quantity sync failed', error))
}

export function mirrorShopClear() {
  void clearServerCart('shop').catch((error) => console.warn('[shop-cart] Clear sync failed', error))
}

function bootstrap() {
  const supabase = getSupabaseBrowserClient()

  void getAuthUserId()
    .then((userId) => {
      if (userId) return adoptServerShopCart(userId)
      return undefined
    })
    .catch((error) => console.warn('[shop-cart] Bootstrap failed', error))

  void supabase.auth.onAuthStateChange((event: AuthChangeEvent, session: Session | null) => {
    const userId = session?.user?.id ?? null

    if (userId) {
      if (userId !== lastHydratedUserId) {
        lastHydratedUserId = null
        void adoptServerShopCart(userId).catch((error) =>
          console.warn('[shop-cart] Auth change hydration failed', error)
        )
      }
      return
    }

    if (event === 'SIGNED_OUT') {
      useShopCartStore.setState((state) => ({
        items: state.items.filter((item) => item.localOnly),
        priceChangedItemIds: [],
      }))
    }
    lastHydratedUserId = null
  })

  let refreshTimer: number | null = null
  window.addEventListener('focus', () => {
    if (refreshTimer) window.clearTimeout(refreshTimer)
    refreshTimer = window.setTimeout(() => {
      void refreshShopCartFromServer()
    }, 400)
  })
}

export function initShopCartSync() {
  if (initStarted || typeof window === 'undefined') return
  initStarted = true
  bootstrap()
}
