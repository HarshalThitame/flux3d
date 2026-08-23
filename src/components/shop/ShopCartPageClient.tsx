'use client'

import { useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { AlertTriangle, ShoppingBag, Trash2 } from 'lucide-react'
import QuantityStepper from '@/components/shop/QuantityStepper'
import {
  ShopAppliedOffer,
  ShopCouponInput,
  useShopCartPromotionSync,
} from '@/components/shop/ShopCartPromotions'
import { formatShopPrice } from '@/lib/shop/selection'
import { getShopCartTotals, useShopCartStore } from '@/stores/shopCartStore'
import { getCartFromStorage, getCartStorageKey } from '@/lib/cart/utils'
import { refreshShopCartFromServer } from '@/lib/cart/shop-cart-sync'
import CartSwitcher from '@/components/cart/CartSwitcher'

function getQuoteCartCount(): number {
  if (typeof window === 'undefined') return 0
  try {
    const quoteItems = getCartFromStorage(getCartStorageKey())
    return quoteItems.length
  } catch {
    return 0
  }
}

export default function ShopCartPageClient() {
  const items = useShopCartStore((state) => state.items)
  const couponCode = useShopCartStore((state) => state.couponCode)
  const discountAmount = useShopCartStore((state) => state.discountAmount)
  const appliedCoupon = useShopCartStore((state) => state.appliedCoupon)
  const autoApplyOffer = useShopCartStore((state) => state.autoApplyOffer)
  const removeItem = useShopCartStore((state) => state.removeItem)
  const updateQuantity = useShopCartStore((state) => state.updateQuantity)
  const clearCart = useShopCartStore((state) => state.clearCart)
  const priceChangedItemIds = useShopCartStore((state) => state.priceChangedItemIds)
  const [quoteCartCount] = useState(getQuoteCartCount)

  useEffect(() => {
    void refreshShopCartFromServer()
  }, [])

  const totals = useMemo(
    () =>
      getShopCartTotals({
        items,
        couponCode,
        discountAmount,
        appliedCoupon,
        autoApplyOffer,
      }),
    [appliedCoupon, autoApplyOffer, couponCode, discountAmount, items]
  )

  useShopCartPromotionSync(totals.subtotal)

  if (items.length === 0) {
    return (
      <main className="px-4 pb-24 pt-6 md:px-8 lg:px-16 lg:pt-8">
        <section className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-8 text-center shadow-[var(--shop-shadow-sm)]">
          <div>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <h1 className="font-[var(--shop-font-heading)] mt-6 text-3xl font-semibold text-[var(--shop-text-primary)]">Your 3D Shop cart is empty</h1>
            <p className="mt-3 text-[var(--shop-text-secondary)]">Add ready-to-ship products from 3D Shop.</p>
            <Link href="/3d-shop" className="mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[var(--shop-radius-lg)] bg-[var(--shop-gold)] px-6 text-sm font-semibold text-[var(--luxury-charcoal)] shadow-[var(--shop-shadow-gold)] transition hover:bg-[var(--shop-gold-light)]">
              Start Shopping
            </Link>
          </div>
        </section>
        <div className="mx-auto mt-6 max-w-3xl">
          <CartSwitcher variant="shop" quoteCartCount={quoteCartCount} />
        </div>
      </main>
    )
  }

  return (
    <main className="px-4 pb-24 pt-6 md:px-8 lg:px-16 lg:pt-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">3D Shop</p>
            <h1 className="font-[var(--shop-font-heading)] mt-2 text-4xl font-semibold text-[var(--shop-text-primary)]">Your Cart</h1>
            <p className="mt-2 text-[var(--shop-text-secondary)]">{totals.itemCount} item{totals.itemCount === 1 ? '' : 's'} ready for checkout.</p>
          </div>
          <button type="button" onClick={clearCart} className="min-h-[44px] rounded-xl border border-rose-200 bg-white px-4 text-sm font-semibold text-rose-600 transition hover:bg-rose-50 hover:text-rose-700">
            Clear cart
          </button>
        </div>

        <div className="mb-6">
          <CartSwitcher variant="shop" quoteCartCount={quoteCartCount} />
        </div>

        {priceChangedItemIds.length > 0 && (
          <div className="mb-6 rounded-[var(--shop-radius-lg)] border border-amber-200 bg-amber-50 p-4 text-sm font-semibold text-amber-800">
            <div className="flex gap-2">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              Prices for some items in your cart have changed since you added them. Your totals below reflect the latest prices.
            </div>
          </div>
        )}

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="space-y-4">
            {items.map((item) => (
              <article
                key={item.cartItemId}
                className={`rounded-[var(--shop-radius-xl)] border p-4 shadow-[var(--shop-shadow-sm)] ${
                  priceChangedItemIds.includes(item.cartItemId)
                    ? 'border-amber-300 bg-amber-50/60'
                    : 'border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)]'
                }`}
              >
                <div className="grid gap-4 sm:grid-cols-[96px_1fr_auto]">
                  <div className="relative aspect-square overflow-hidden rounded-[var(--shop-radius-lg)] bg-[var(--shop-bg-muted)]">
                    {item.thumbnail ? (
                      <Image src={item.thumbnail} alt={item.productName} fill sizes="96px" className="object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-3xl text-[var(--shop-text-subtle)]">🧩</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link href={`/3d-shop/product/${item.productSlug}`} className="line-clamp-2 text-lg font-semibold leading-snug text-[var(--shop-text-primary)] transition hover:text-[var(--shop-gold)]">
                      {item.productName}
                    </Link>
                    <p className="mt-2 text-sm text-[var(--shop-text-muted)]">{item.variantLabel}</p>
                    {item.customizationText && (
                      <p className="mt-1 text-sm italic text-[var(--shop-text-secondary)]">Engraved: {item.customizationText}</p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-4">
                      <QuantityStepper
                        value={item.quantity}
                        max={item.maxStock}
                        onChangeAction={(quantity) => updateQuantity(item.cartItemId, quantity)}
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.cartItemId)}
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--shop-border-light)] bg-white px-3 text-sm font-semibold text-rose-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-sm text-[var(--shop-text-muted)]">{formatShopPrice(item.price)} each</div>
                    <div className="mt-1 text-xl font-semibold text-[var(--shop-text-primary)]">{formatShopPrice(item.price * item.quantity)}</div>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="h-fit rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-5 shadow-[var(--shop-shadow-sm)] lg:sticky lg:top-28">
            <h2 className="font-[var(--shop-font-heading)] text-xl font-semibold text-[var(--shop-text-primary)]">Order Summary</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-[var(--shop-text-secondary)]">
                <span>Subtotal</span>
                <span className="font-semibold text-[var(--shop-text-primary)]">{formatShopPrice(totals.subtotal)}</span>
              </div>
              {totals.couponDiscountAmount > 0 && totals.appliedCoupon && (
                <div className="flex justify-between text-[var(--shop-gold)]">
                  <span>Coupon ({totals.appliedCoupon.code})</span>
                  <span className="font-semibold">-{formatShopPrice(totals.couponDiscountAmount)}</span>
                </div>
              )}
              {totals.offerDiscountAmount > 0 && totals.appliedOffer && (
                <div className="flex justify-between text-[var(--shop-gold)]">
                  <span>Offer ({totals.appliedOffer.title})</span>
                  <span className="font-semibold">-{formatShopPrice(totals.offerDiscountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[var(--shop-text-secondary)]">
                <span>Shipping</span>
                <span>{totals.freeShipping ? 'Free with promotion' : 'Calculated at checkout'}</span>
              </div>
            </div>

            <div className="mt-5 space-y-3">
              <ShopAppliedOffer offer={totals.appliedOffer} />
              <ShopCouponInput
                orderAmount={totals.subtotal}
                appliedCoupon={totals.appliedCoupon}
                couponCode={couponCode}
              />
            </div>

            <div className="mt-5 flex items-center justify-between border-t border-[var(--shop-border-light)] pt-5">
              <span className="text-lg font-semibold text-[var(--shop-text-primary)]">Total</span>
              <span className="font-[var(--shop-font-heading)] text-2xl font-semibold text-[var(--shop-text-primary)]">{formatShopPrice(totals.total)}</span>
            </div>
            <Link href="/3d-shop/checkout" className="mt-5 flex min-h-[52px] w-full items-center justify-center gap-2 rounded-[var(--shop-radius-lg)] bg-[var(--shop-gold)] px-6 text-base font-semibold text-[var(--luxury-charcoal)] shadow-[var(--shop-shadow-gold)] transition hover:bg-[var(--shop-gold-light)]">
              Proceed to Checkout
            </Link>
            <Link href="/3d-shop" className="mt-4 block text-center text-sm font-semibold text-[var(--shop-text-secondary)] transition hover:text-[var(--shop-gold)]">
              Continue Shopping
            </Link>
          </aside>
        </div>
      </div>
    </main>
  )
}
