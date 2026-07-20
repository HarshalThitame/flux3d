'use client'

import { useEffect, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { AnimatePresence, motion } from 'framer-motion'
import { ShoppingBag, Trash2, X } from 'lucide-react'
import QuantityStepper from '@/components/shop/QuantityStepper'
import {
  ShopAppliedOffer,
  ShopCouponInput,
  useShopCartPromotionSync,
} from '@/components/shop/ShopCartPromotions'
import { formatShopPrice } from '@/lib/shop/selection'
import { getShopCartTotals, useShopCartStore } from '@/stores/shopCartStore'

export function ShopCartNavButton({ mobile = false, onOpenAction }: { mobile?: boolean; onOpenAction?: () => void }) {
  const itemCount = useShopCartStore((state) => getShopCartTotals(state).itemCount)
  const label = '3D Shop Cart'

  return (
    <Link
      href="/3d-shop/cart"
      onClick={() => {
        onOpenAction?.()
      }}
      aria-label={label}
      title={mobile ? undefined : label}
      className={
        mobile
          ? 'navbar-mobile-action-light relative flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--border-light)] bg-white py-3.5 text-base font-medium text-[var(--text-secondary)]'
          : 'shop-cart-nav-button group relative inline-flex h-[42px] w-[42px] shrink-0 items-center justify-center rounded-full border border-[var(--border-light)] bg-white text-[var(--text-secondary)] shadow-[0_10px_28px_rgba(15,23,42,0.06)] backdrop-blur transition hover:border-[var(--border-brand)] hover:bg-white hover:text-[var(--text-primary)]'
      }
    >
      <ShoppingBag className="h-4 w-4" />
      <span className={mobile ? undefined : 'sr-only'}>{label}</span>
      {itemCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--brand-primary)] px-1 text-[10px] font-bold text-white shadow-[var(--shadow-brand)]">
          {itemCount}
        </span>
      )}
    </Link>
  )
}

export default function ShopCartDrawer({
  open,
  onCloseAction,
}: {
  open?: boolean
  onCloseAction?: () => void
}) {
  const router = useRouter()
  const items = useShopCartStore((state) => state.items)
  const couponCode = useShopCartStore((state) => state.couponCode)
  const discountAmount = useShopCartStore((state) => state.discountAmount)
  const appliedCoupon = useShopCartStore((state) => state.appliedCoupon)
  const autoApplyOffer = useShopCartStore((state) => state.autoApplyOffer)
  const isCartOpen = open ?? useShopCartStore((state) => state.isCartOpen)
  const storeCloseCart = useShopCartStore((state) => state.closeCart)
  const removeItem = useShopCartStore((state) => state.removeItem)
  const updateQuantity = useShopCartStore((state) => state.updateQuantity)
  const clearCart = useShopCartStore((state) => state.clearCart)
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

  const closeCart = onCloseAction ?? storeCloseCart

  useEffect(() => {
    if (!isCartOpen) return
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = prev }
  }, [isCartOpen])

  useEffect(() => {
    if (!isCartOpen) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeCart() }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [isCartOpen, closeCart])

  function goToCheckout() {
    closeCart()
    router.push('/3d-shop/checkout')
  }

  function continueShopping() {
    closeCart()
    router.push('/3d-shop')
  }

  return (
    <AnimatePresence>
      {isCartOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.18 }}
          className="fixed inset-0 z-[130]"
        >
          <button
            type="button"
            aria-label="Close 3D Shop cart"
            className="absolute inset-0 bg-slate-900/55 backdrop-blur-sm"
            onClick={closeCart}
          />
          <motion.aside
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-0 left-0 right-0 flex h-[92vh] min-h-0 flex-col overflow-hidden rounded-t-3xl border border-[var(--border-light)] bg-[var(--bg-base)] shadow-[var(--shadow-lg)] md:bottom-0 md:left-auto md:top-0 md:h-full md:w-[440px] md:rounded-none md:rounded-l-3xl"
          >
            <div className="flex items-center justify-between border-b border-[var(--border-light)] px-5 py-4">
              <div>
                <h2 className="text-xl font-bold text-[var(--text-primary)]">Your Cart ({totals.itemCount} items)</h2>
                <p className="text-sm text-[var(--text-muted)]">3D Shop</p>
              </div>
              <button
                type="button"
                onClick={closeCart}
                className="grid h-10 w-10 place-items-center rounded-xl border border-[var(--border-light)] bg-white text-[var(--text-secondary)]"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="grid flex-1 place-items-center px-6 py-16 text-center">
                <div>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[var(--brand-faint)] text-[var(--brand-primary)]">
                    <ShoppingBag className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 text-2xl font-bold text-[var(--text-primary)]">Your cart is empty</h3>
                  <button type="button" onClick={continueShopping} className="btn-primary mt-6 min-h-[48px] px-6">
                    Start Shopping
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="scrollbar-hide min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5">
                  {items.map((item) => (
                    <article key={item.cartItemId} className="rounded-2xl border border-[var(--border-light)] bg-white p-3">
                      <div className="flex gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--bg-muted)]">
                          {item.thumbnail ? <Image src={item.thumbnail} alt={item.productName} fill sizes="48px" className="object-cover" /> : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-[var(--text-primary)]">{item.productName}</h3>
                          <p className="mt-1 text-xs text-[var(--text-muted)]">{item.variantLabel}</p>
                          {item.customizationText && (
                            <p className="mt-1 text-xs italic text-[var(--text-secondary)]">Engraved: {item.customizationText}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.cartItemId)}
                          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--text-muted)] hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      <div className="mt-3 flex items-center justify-between gap-3">
                        <QuantityStepper
                          value={item.quantity}
                          max={item.maxStock}
                          compact
                          onChangeAction={(quantity) => updateQuantity(item.cartItemId, quantity)}
                        />
                        <div className="text-right">
                          <div className="text-xs text-[var(--text-muted)]">{formatShopPrice(item.price)} each</div>
                          <div className="font-bold text-[var(--text-primary)]">{formatShopPrice(item.price * item.quantity)}</div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="border-t border-[var(--border-light)] bg-white p-5">
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between text-[var(--text-secondary)]">
                      <span>Subtotal</span>
                      <span className="font-semibold text-[var(--text-primary)]">{formatShopPrice(totals.subtotal)}</span>
                    </div>
                    {totals.couponDiscountAmount > 0 && totals.appliedCoupon && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Coupon ({totals.appliedCoupon.code})</span>
                        <span className="font-semibold">-{formatShopPrice(totals.couponDiscountAmount)}</span>
                      </div>
                    )}
                    {totals.offerDiscountAmount > 0 && totals.appliedOffer && (
                      <div className="flex justify-between text-emerald-700">
                        <span>Offer ({totals.appliedOffer.title})</span>
                        <span className="font-semibold">-{formatShopPrice(totals.offerDiscountAmount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-[var(--text-secondary)]">
                      <span>Shipping</span>
                      <span>{totals.freeShipping ? 'Free with promotion' : 'Calculated at checkout'}</span>
                    </div>
                  </div>

                  <div className="mt-4 space-y-3">
                    <ShopAppliedOffer offer={totals.appliedOffer} />
                    <ShopCouponInput
                      orderAmount={totals.subtotal}
                      appliedCoupon={totals.appliedCoupon}
                      couponCode={couponCode}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[var(--border-light)] pt-4">
                    <span className="text-base font-bold text-[var(--text-primary)]">Total</span>
                    <span className="text-xl font-extrabold text-[var(--text-primary)]">{formatShopPrice(totals.total)}</span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <button type="button" onClick={goToCheckout} className="btn-primary min-h-[50px] w-full">
                      Proceed to Checkout
                    </button>
                    <button type="button" onClick={continueShopping} className="text-sm font-semibold text-[var(--text-secondary)]">
                      Continue Shopping
                    </button>
                    <button type="button" onClick={clearCart} className="text-xs font-semibold text-red-600">
                      Clear cart
                    </button>
                  </div>
                </div>
              </>
            )}
      </motion.aside>
    </motion.div>
      )}
    </AnimatePresence>
  )
}
