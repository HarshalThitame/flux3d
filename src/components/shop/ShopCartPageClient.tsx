'use client'

import { useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { ShoppingBag, Trash2 } from 'lucide-react'
import QuantityStepper from '@/components/shop/QuantityStepper'
import {
  ShopAppliedOffer,
  ShopCouponInput,
  useShopCartPromotionSync,
} from '@/components/shop/ShopCartPromotions'
import { formatShopPrice } from '@/lib/shop/selection'
import { getShopCartTotals, useShopCartStore } from '@/stores/shopCartStore'
import { getCartFromStorage, getCartStorageKey } from '@/lib/cart/utils'
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
  const [quoteCartCount] = useState(getQuoteCartCount)

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
      <main className="px-4 pb-20 pt-5 md:px-8 lg:px-16">
        <section className="mx-auto grid min-h-[60vh] max-w-3xl place-items-center rounded-3xl border border-[var(--border-light)] bg-white p-8 text-center shadow-[var(--shadow-sm)]">
          <div>
            <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[var(--brand-faint)] text-[var(--brand-primary)]">
              <ShoppingBag className="h-7 w-7" />
            </div>
            <h1 className="mt-6 text-3xl font-extrabold text-[var(--text-primary)]">Your 3D Shop cart is empty</h1>
            <p className="mt-3 text-[var(--text-secondary)]">Add ready-to-ship products from 3D Shop.</p>
            <Link href="/3d-shop" className="btn-primary mt-6 inline-flex min-h-[48px] items-center px-6">
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
    <main className="px-4 pb-20 pt-5 md:px-8 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-[var(--brand-primary)]">3D Shop</p>
            <h1 className="mt-2 text-4xl font-extrabold text-[var(--text-primary)]">Your Cart</h1>
            <p className="mt-2 text-[var(--text-secondary)]">{totals.itemCount} item{totals.itemCount === 1 ? '' : 's'} ready for checkout.</p>
          </div>
          <button type="button" onClick={clearCart} className="min-h-[44px] rounded-xl border border-red-200 bg-white px-4 text-sm font-bold text-red-600">
            Clear cart
          </button>
        </div>

        <div className="mb-6">
          <CartSwitcher variant="shop" quoteCartCount={quoteCartCount} />
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_380px]">
          <section className="space-y-4">
            {items.map((item) => (
              <article key={item.cartItemId} className="rounded-3xl border border-[var(--border-light)] bg-white p-4 shadow-[var(--shadow-sm)]">
                <div className="grid gap-4 sm:grid-cols-[96px_1fr_auto]">
                  <div className="relative aspect-square overflow-hidden rounded-2xl bg-[var(--bg-muted)]">
                    {item.thumbnail ? (
                      <Image src={item.thumbnail} alt={item.productName} fill sizes="96px" className="object-cover" />
                    ) : (
                      <div className="grid h-full place-items-center text-3xl">🧩</div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <Link href={`/3d-shop/product/${item.productSlug}`} className="line-clamp-2 text-lg font-bold leading-snug text-[var(--text-primary)] hover:text-[var(--brand-primary)]">
                      {item.productName}
                    </Link>
                    <p className="mt-2 text-sm text-[var(--text-muted)]">{item.variantLabel}</p>
                    {item.customizationText && (
                      <p className="mt-1 text-sm italic text-[var(--text-secondary)]">Engraved: {item.customizationText}</p>
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
                        className="inline-flex min-h-[44px] items-center gap-2 rounded-xl border border-[var(--border-light)] px-3 text-sm font-bold text-red-600"
                      >
                        <Trash2 className="h-4 w-4" />
                        Remove
                      </button>
                    </div>
                  </div>
                  <div className="text-left sm:text-right">
                    <div className="text-sm text-[var(--text-muted)]">{formatShopPrice(item.price)} each</div>
                    <div className="mt-1 text-xl font-extrabold text-[var(--text-primary)]">{formatShopPrice(item.price * item.quantity)}</div>
                  </div>
                </div>
              </article>
            ))}
          </section>

          <aside className="h-fit rounded-3xl border border-[var(--border-light)] bg-white p-5 shadow-[var(--shadow-sm)] lg:sticky lg:top-28">
            <h2 className="text-xl font-extrabold text-[var(--text-primary)]">Order Summary</h2>
            <div className="mt-5 space-y-3 text-sm">
              <div className="flex justify-between text-[var(--text-secondary)]">
                <span>Subtotal</span>
                <span className="font-bold text-[var(--text-primary)]">{formatShopPrice(totals.subtotal)}</span>
              </div>
              {totals.couponDiscountAmount > 0 && totals.appliedCoupon && (
                <div className="flex justify-between text-emerald-700">
                  <span>Coupon ({totals.appliedCoupon.code})</span>
                  <span className="font-bold">-{formatShopPrice(totals.couponDiscountAmount)}</span>
                </div>
              )}
              {totals.offerDiscountAmount > 0 && totals.appliedOffer && (
                <div className="flex justify-between text-emerald-700">
                  <span>Offer ({totals.appliedOffer.title})</span>
                  <span className="font-bold">-{formatShopPrice(totals.offerDiscountAmount)}</span>
                </div>
              )}
              <div className="flex justify-between text-[var(--text-secondary)]">
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

            <div className="mt-5 flex items-center justify-between border-t border-[var(--border-light)] pt-5">
              <span className="text-lg font-bold text-[var(--text-primary)]">Total</span>
              <span className="text-2xl font-extrabold text-[var(--text-primary)]">{formatShopPrice(totals.total)}</span>
            </div>
            <Link href="/3d-shop/checkout" className="btn-primary mt-5 flex min-h-[52px] w-full items-center justify-center">
              Proceed to Checkout
            </Link>
            <Link href="/3d-shop" className="mt-4 block text-center text-sm font-bold text-[var(--text-secondary)]">
              Continue Shopping
            </Link>
          </aside>
        </div>
      </div>
    </main>
  )
}
