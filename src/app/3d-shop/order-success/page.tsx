import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  BadgeCheck,
  Banknote,
  CalendarClock,
  Check,
  CircleDot,
  Clock3,
  MapPin,
  PackageCheck,
  ReceiptText,
  ShoppingBag,
  Sparkles,
} from 'lucide-react'
import Navbar from '@/components/Navbar'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getCurrentUserProfile } from '@/lib/auth/server'
import {
  formatShopOrderDateTime,
  getShopFulfilmentStatusLabel,
  getShopPaymentStatusLabel,
  SHOP_FULFILMENT_PROGRESS,
  mapShopOrderRow,
  normalizeShopOrderMoney,
  type ShopOrder,
} from '@/lib/shop/orders'
import { formatShopPrice } from '@/lib/shop/selection'

export const metadata: Metadata = {
  title: 'Order Placed — 3D Shop',
  description: 'Your 3D Shop order has been placed successfully.',
}

type ShopOrderSuccessPageProps = {
  searchParams: Promise<{ orderId?: string | string[] }>
}

function getSearchValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function getOrderItemCount(order: ShopOrder) {
  return order.items.reduce((count, item) => count + normalizeShopOrderMoney(item.quantity), 0)
}

function getPrimaryImage(order: ShopOrder) {
  return order.items.find((item) => item.productThumbnail)?.productThumbnail ?? null
}

function getPaymentModeLabel(value: string | null) {
  const normalized = value?.trim().toLowerCase()
  if (!normalized) return 'Not set'
  if (normalized === 'razorpay') return 'Razorpay'
  if (normalized === 'payu') return 'PayU'
  if (normalized === 'cod' || normalized === 'cash_on_delivery' || normalized === 'cash on delivery') return 'Cash on Delivery'
  if (normalized === 'upi') return 'UPI'
  if (normalized === 'card') return 'Credit / Debit Card'
  if (normalized === 'netbanking') return 'Net Banking'
  if (normalized === 'wallet') return 'Wallet'
  if (normalized === 'emi') return 'EMI'
  if (normalized === 'bank_transfer') return 'Bank Transfer'
  if (normalized === 'paylater') return 'Pay Later'
  if (normalized === 'cardless_emi') return 'Cardless EMI'
  return value
}

async function getSuccessOrder(orderId: string, userId: string) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('shelf_orders')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data ? mapShopOrderRow(data) : null
}

export default async function ShopOrderSuccessPage({ searchParams }: ShopOrderSuccessPageProps) {
  const auth = await getCurrentUserProfile()
  const { orderId: rawOrderId } = await searchParams
  const orderId = getSearchValue(rawOrderId)

  if (!auth) {
    const nextPath = orderId
      ? `/3d-shop/order-success?orderId=${encodeURIComponent(orderId)}`
      : '/3d-shop/orders'
    redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  }

  if (!orderId) redirect('/3d-shop/orders')

  const order = await getSuccessOrder(orderId, auth.profile.id)
  if (!order) redirect('/3d-shop/orders')

  const itemCount = getOrderItemCount(order)
  const primaryImage = getPrimaryImage(order)
  const previewItems = order.items.slice(0, 4)
  const currentFulfilmentIndex = SHOP_FULFILMENT_PROGRESS.indexOf(order.fulfilment_status)
  const timeline = SHOP_FULFILMENT_PROGRESS.map((status, index) => ({
    label: getShopFulfilmentStatusLabel(status),
    detail: index === 0 ? 'Order locked' : index === 3 ? 'Dispatch prep' : index === 4 ? 'Tracking shared' : '',
    active: index <= currentFulfilmentIndex,
  }))

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Navbar transparent />

      <main className="relative isolate overflow-hidden px-4 pb-16 pt-7 sm:px-6 lg:px-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[linear-gradient(118deg,#f9f7f4_0%,#ffffff_45%,#f5f3ff_100%)]" />
        <div className="pointer-events-none absolute inset-0 -z-10 opacity-[0.32] [background-image:linear-gradient(rgba(109,40,217,0.08)_1px,transparent_1px),linear-gradient(90deg,rgba(109,40,217,0.06)_1px,transparent_1px)] [background-size:42px_42px]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-[linear-gradient(0deg,rgba(16,185,129,0.09),transparent)]" />

        <div className="mx-auto max-w-7xl">
          <section className="grid min-h-[calc(100vh-130px)] items-center gap-8 py-8 lg:grid-cols-[minmax(0,1.03fr)_minmax(360px,0.7fr)] lg:py-12">
            <div className="min-w-0">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-emerald-700 shadow-[var(--shadow-sm)]">
                <BadgeCheck className="h-4 w-4 shrink-0" />
                Order Placed
              </div>

              <h1 className="mt-6 max-w-4xl text-[clamp(2.8rem,7vw,6.2rem)] font-black leading-[0.92] tracking-[0] text-[var(--text-primary)]">
                Your 3D Shop order is confirmed.
              </h1>

              <p className="mt-6 max-w-2xl text-base leading-7 text-[var(--text-secondary)] sm:text-lg lg:leading-8">
                We have reserved your items, captured the delivery details, and queued the order for fulfillment.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/3d-shop/order/${order.id}`}
                  className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[var(--gradient-brand)] px-5 text-sm font-extrabold text-white shadow-[var(--shadow-brand)] transition hover:bg-[var(--gradient-brand-hover)]"
                >
                  Track Order
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/3d-shop"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[var(--border-light)] bg-white/80 px-5 text-sm font-bold text-[var(--text-primary)] shadow-[var(--shadow-sm)] backdrop-blur transition hover:border-[var(--border-brand)] hover:bg-white hover:text-[var(--brand-primary)]"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Continue Shopping
                </Link>
              </div>

              <div className="mt-9 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <div className="rounded-2xl border border-[var(--border-light)] bg-white/85 p-4 shadow-[var(--shadow-sm)] backdrop-blur">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    <ReceiptText className="h-4 w-4 text-emerald-600" />
                    Order
                  </div>
                  <div className="mt-2 break-all text-lg font-black text-[var(--text-primary)]">#{order.order_number}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border-light)] bg-white/85 p-4 shadow-[var(--shadow-sm)] backdrop-blur">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    <PackageCheck className="h-4 w-4 text-sky-600" />
                    Items
                  </div>
                  <div className="mt-2 text-lg font-black text-[var(--text-primary)]">{itemCount} item{itemCount === 1 ? '' : 's'}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border-light)] bg-white/85 p-4 shadow-[var(--shadow-sm)] backdrop-blur">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    <Banknote className="h-4 w-4 text-amber-600" />
                    Total
                  </div>
                  <div className="mt-2 text-lg font-black text-[var(--text-primary)]">{formatShopPrice(order.total_amount)}</div>
                </div>
                <div className="rounded-2xl border border-[var(--border-light)] bg-white/85 p-4 shadow-[var(--shadow-sm)] backdrop-blur">
                  <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                    <MapPin className="h-4 w-4 text-rose-600" />
                    Delivery
                  </div>
                  <div className="mt-2 truncate text-lg font-black text-[var(--text-primary)]">{order.shipping_address.city}</div>
                </div>
              </div>
            </div>

            <aside className="relative">
              <div className="relative overflow-hidden rounded-[28px] border border-white bg-[linear-gradient(155deg,rgba(255,255,255,0.96),rgba(245,243,255,0.88))] p-3 shadow-[0_30px_100px_rgba(26,26,26,0.14)] backdrop-blur-2xl">
                <div className="rounded-[22px] border border-[var(--border-light)] bg-white/90 p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-primary)]">
                        <Sparkles className="h-4 w-4" />
                        Flux3D Shop
                      </div>
                      <div className="mt-3 text-2xl font-black text-[var(--text-primary)]">Success Receipt</div>
                      <div className="mt-1 text-sm font-semibold text-[var(--text-muted)]">
                        {formatShopOrderDateTime(order.placed_at)}
                      </div>
                    </div>
                    <div className="grid h-14 w-14 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[var(--shadow-sm)]">
                      <Check className="h-8 w-8" strokeWidth={2.6} />
                    </div>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-[20px] border border-[var(--border-light)] bg-white">
                    {primaryImage ? (
                      <div className="relative aspect-[16/10] bg-[var(--bg-muted)]">
                        <Image
                          src={primaryImage}
                          alt={order.items[0]?.productName || '3D Shop order item'}
                          fill
                          sizes="(min-width: 1024px) 420px, 100vw"
                          className="object-cover"
                          priority
                        />
                        <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_34%,rgba(255,255,255,0.94))]" />
                        <div className="absolute bottom-4 left-4 right-4">
                          <div className="line-clamp-1 text-lg font-black text-[var(--text-primary)]">
                            {order.items[0]?.productName}
                          </div>
                          <div className="mt-1 line-clamp-1 text-sm font-semibold text-[var(--text-secondary)]">
                            {order.items[0]?.variantLabel}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid aspect-[16/10] place-items-center bg-[linear-gradient(135deg,#f5f3ff,#ecfdf5)]">
                        <PackageCheck className="h-16 w-16 text-emerald-600" />
                      </div>
                    )}

                    <div className="grid grid-cols-3 divide-x divide-[var(--border-light)] border-t border-[var(--border-light)] text-center">
                      <div className="px-3 py-4">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Status</div>
                        <div className="mt-1 text-sm font-black text-emerald-700">{getShopFulfilmentStatusLabel(order.fulfilment_status)}</div>
                      </div>
                      <div className="px-3 py-4">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Payment</div>
                        <div className="mt-1 text-sm font-black text-[var(--text-primary)]">{getShopPaymentStatusLabel(order.payment_status)}</div>
                      </div>
                      <div className="px-3 py-4">
                        <div className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Mode</div>
                        <div className="mt-1 text-sm font-black text-[var(--text-primary)]">
                          {getPaymentModeLabel(order.payment_provider ?? order.payment_method)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {previewItems.map((item) => (
                      <div key={`${item.skuId}-${item.customizationText ?? ''}`} className="grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-2xl border border-[var(--border-light)] bg-[var(--bg-soft)] p-2.5">
                        <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-[var(--bg-muted)]">
                          {item.productThumbnail ? (
                            <Image src={item.productThumbnail} alt={item.productName} fill sizes="48px" className="object-cover" />
                          ) : (
                            <div className="grid h-full place-items-center">
                              <PackageCheck className="h-5 w-5 text-[var(--text-muted)]" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="line-clamp-1 text-sm font-black text-[var(--text-primary)]">{item.productName}</div>
                          <div className="line-clamp-1 text-xs font-semibold text-[var(--text-muted)]">{item.variantLabel}</div>
                        </div>
                        <div className="text-right text-sm font-black text-[var(--text-primary)]">x{item.quantity}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </section>

          <section className="rounded-[28px] border border-[var(--border-light)] bg-white/85 p-5 shadow-[var(--shadow-md)] backdrop-blur md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.18em] text-[var(--brand-primary)]">
                  <CircleDot className="h-4 w-4" />
                  Live Fulfillment
                </div>
                <h2 className="mt-2 !text-2xl font-black text-[var(--text-primary)]">What happens next</h2>
              </div>
              <Link
                href="/3d-shop/orders"
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[var(--border-light)] bg-white px-4 text-sm font-bold text-[var(--text-primary)] shadow-[var(--shadow-sm)] transition hover:border-[var(--border-brand)] hover:text-[var(--brand-primary)]"
              >
                All Shop Orders
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 grid gap-3 grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
              {timeline.map((step, index) => (
                <div
                  key={step.label}
                  className={`rounded-2xl border p-4 ${
                    step.active
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-[var(--border-light)] bg-[var(--bg-soft)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className={`grid h-9 w-9 place-items-center rounded-full border ${
                      step.active ? 'border-emerald-200 bg-emerald-600 text-white' : 'border-[var(--border-light)] bg-white text-[var(--text-muted)]'
                    }`}>
                      {step.active ? <Check className="h-5 w-5" /> : index + 1}
                    </div>
                    {step.active ? (
                      <BadgeCheck className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Clock3 className="h-5 w-5 text-[var(--text-muted)]" />
                    )}
                  </div>
                  <div className="mt-4 text-base font-black">{step.label}</div>
                  <div className="mt-1 text-sm font-semibold opacity-70">{step.detail}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-soft)] p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  <CalendarClock className="h-4 w-4 text-sky-600" />
                  Placed
                </div>
                <div className="mt-2 text-sm font-bold text-[var(--text-primary)]">{formatShopOrderDateTime(order.placed_at)}</div>
              </div>
              <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-soft)] p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  <Banknote className="h-4 w-4 text-amber-600" />
                  Payable
                </div>
                <div className="mt-2 text-sm font-bold text-[var(--text-primary)]">{formatShopPrice(order.total_amount)} on delivery</div>
              </div>
              <div className="rounded-2xl border border-[var(--border-light)] bg-[var(--bg-soft)] p-4">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">
                  <MapPin className="h-4 w-4 text-rose-600" />
                  Destination
                </div>
                <div className="mt-2 line-clamp-1 text-sm font-bold text-[var(--text-primary)]">
                  {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}
                </div>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  )
}
