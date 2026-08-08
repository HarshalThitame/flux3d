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
          ? 'navbar-mobile-action-light relative flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl border border-[var(--shop-border-light)] bg-white py-3.5 text-base font-medium text-[var(--shop-text-secondary)]'
          : 'shop-cart-nav-button group relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--shop-border-light)] bg-white text-[var(--shop-text-secondary)] shadow-[0_10px_28px_rgba(28,25,23,0.06)] backdrop-blur transition hover:border-[var(--shop-border-gold)] hover:bg-white hover:text-[var(--shop-text-primary)]'
      }
    >
      <ShoppingBag className="h-4 w-4" />
      <span className={mobile ? undefined : 'sr-only'}>{label}</span>
      {itemCount > 0 && (
        <span className="absolute -right-1.5 -top-1.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--shop-gold)] px-1 text-[10px] font-bold text-[var(--luxury-charcoal)] shadow-[var(--shop-shadow-gold)]">
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
  const storeIsCartOpen = useShopCartStore((state) => state.isCartOpen)
  const isCartOpen = open ?? storeIsCartOpen
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
            className="absolute inset-0 bg-[#2e1065]/40 backdrop-blur-sm"
            onClick={closeCart}
          />
          <motion.aside
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
            className="absolute bottom-0 left-0 right-0 flex h-[92dvh] min-h-0 flex-col overflow-hidden rounded-t-3xl border border-[var(--shop-border-light)] bg-[var(--shop-bg-base)]/90 pb-[env(safe-area-inset-bottom)] shadow-[var(--shop-shadow-lg)] backdrop-blur-2xl md:bottom-0 md:left-auto md:top-0 md:h-full md:w-[440px] md:rounded-none md:rounded-l-3xl md:pb-0"
          >
            <div className="flex items-center justify-between border-b border-[var(--shop-border-light)] px-5 py-4">
              <div>
                <h2 className="text-xl font-semibold text-[var(--shop-text-primary)]">Your Cart ({totals.itemCount} items)</h2>
                <p className="text-sm text-[var(--shop-text-muted)]">3D Shop</p>
              </div>
              <button
                type="button"
                onClick={closeCart}
                aria-label="Close cart"
                className="grid h-11 w-11 place-items-center rounded-xl border border-[var(--shop-border-light)] bg-white text-[var(--shop-text-secondary)]"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {items.length === 0 ? (
              <div className="grid flex-1 place-items-center px-6 py-16 text-center">
                <div>
                  <div className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]">
                    <ShoppingBag className="h-7 w-7" />
                  </div>
                  <h3 className="mt-5 text-2xl font-semibold text-[var(--shop-text-primary)]">Your cart is empty</h3>
                  <button type="button" onClick={continueShopping} className="mt-6 inline-flex min-h-[48px] items-center justify-center gap-2 rounded-[var(--shop-radius-lg)] bg-[var(--shop-gold)] px-6 text-base font-semibold text-[var(--luxury-charcoal)] shadow-[var(--shop-shadow-gold)] transition hover:bg-[var(--shop-gold-light)]">
                    Start Shopping
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="scrollbar-hide min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-5 py-5">
                  {items.map((item) => (
                    <article key={item.cartItemId} className="rounded-2xl border border-[var(--shop-border-light)] bg-white p-3">
                      <div className="flex gap-3">
                        <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-xl bg-[var(--shop-bg-muted)]">
                          {item.thumbnail ? <Image src={item.thumbnail} alt={item.productName} fill sizes="48px" className="object-cover" /> : null}
                        </div>
                        <div className="min-w-0 flex-1">
                          <h3 className="line-clamp-2 text-sm font-semibold leading-snug text-[var(--shop-text-primary)]">{item.productName}</h3>
                          <p className="mt-1 text-xs text-[var(--shop-text-muted)]">{item.variantLabel}</p>
                          {item.customizationText && (
                            <p className="mt-1 text-xs italic text-[var(--shop-text-secondary)]">Engraved: {item.customizationText}</p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => removeItem(item.cartItemId)}
                          aria-label={`Remove ${item.productName} from cart`}
                          className="grid h-10 w-10 shrink-0 place-items-center rounded-lg text-[var(--shop-text-muted)] transition hover:bg-rose-50 hover:text-rose-600"
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
                          <div className="text-xs text-[var(--shop-text-muted)]">{formatShopPrice(item.price)} each</div>
                          <div className="font-semibold text-[var(--shop-text-primary)]">{formatShopPrice(item.price * item.quantity)}</div>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>

                <div className="border-t border-[var(--shop-border-light)] bg-white p-5">
                  <div className="space-y-2 text-sm">
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

                  <div className="mt-4 space-y-3">
                    <ShopAppliedOffer offer={totals.appliedOffer} />
                    <ShopCouponInput
                      orderAmount={totals.subtotal}
                      appliedCoupon={totals.appliedCoupon}
                      couponCode={couponCode}
                    />
                  </div>

                  <div className="mt-4 flex items-center justify-between border-t border-[var(--shop-border-light)] pt-4">
                    <span className="text-base font-bold text-[var(--shop-text-primary)]">Total</span>
                    <span className="text-xl font-bold text-[var(--shop-text-primary)]">{formatShopPrice(totals.total)}</span>
                  </div>
                  <div className="mt-4 grid gap-3">
                    <button type="button" onClick={goToCheckout} className="inline-flex min-h-[50px] w-full items-center justify-center gap-2 rounded-[var(--shop-radius-lg)] bg-[var(--shop-gold)] px-6 text-base font-semibold text-[var(--luxury-charcoal)] shadow-[var(--shop-shadow-gold)] transition hover:bg-[var(--shop-gold-light)]">
                      Proceed to Checkout
                    </button>
                    <button type="button" onClick={continueShopping} className="text-sm font-semibold text-[var(--shop-text-secondary)]">
                      Continue Shopping
                    </button>
                    <button type="button" onClick={clearCart} className="text-xs font-semibold text-rose-600 transition hover:text-rose-700">
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
