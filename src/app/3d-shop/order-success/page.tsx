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
import ShopShell from '@/components/shop/ShopShell'
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
import ShopOrderTracking from './ShopOrderTracking'

export const metadata: Metadata = {
  title: 'Order Placed — 3D Shop',
  description: 'Your 3D Shop order has been placed successfully.',
  robots: {
    index: false,
    follow: false,
  },
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
    <ShopShell transparentNav>
      <main className="relative isolate overflow-hidden px-4 pb-16 pt-7 sm:px-6 lg:px-10 lg:pb-24 lg:pt-10">
        <div className="pointer-events-none absolute inset-0 -z-10 bg-[var(--shop-gradient-hero)]" />
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-28 bg-[linear-gradient(180deg,rgba(255,255,255,0.9),transparent)]" />
        <div className="pointer-events-none absolute inset-x-0 bottom-0 -z-10 h-56 bg-[linear-gradient(0deg,rgba(16,185,129,0.06),transparent)]" />

        <div className="mx-auto max-w-7xl">
          <section className="grid min-h-[calc(100vh-130px)] items-center gap-10 py-8 lg:grid-cols-[minmax(0,1.03fr)_minmax(360px,0.7fr)] lg:py-12">
            <div className="min-w-0">
              <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.14em] text-emerald-700 shadow-[var(--shop-shadow-sm)]">
                <BadgeCheck className="h-4 w-4 shrink-0" />
                Order Placed
              </div>

              <h1 className="font-[var(--shop-font-heading)] mt-6 max-w-4xl text-[clamp(2.8rem,7vw,6.2rem)] font-semibold leading-[0.95] tracking-[-0.03em] text-[var(--shop-text-primary)]">
                Your order is confirmed.
              </h1>

              <p className="mt-6 max-w-2xl text-lg leading-8 text-[var(--shop-text-secondary)]">
                We have reserved your items, captured the delivery details, and queued the order for fulfillment.
              </p>

              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Link
                  href={`/3d-shop/order/${order.id}`}
                  className="group inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl bg-[var(--shop-text-primary)] px-6 text-sm font-semibold text-white shadow-[var(--shop-shadow-sm)] transition hover:bg-[var(--shop-text-secondary)] hover:shadow-[var(--shop-shadow-md)]"
                >
                  Track Order
                  <ArrowRight className="h-4 w-4 transition group-hover:translate-x-0.5" />
                </Link>
                <Link
                  href="/3d-shop"
                  className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-xl border border-[var(--shop-border-light)] bg-white px-6 text-sm font-semibold text-[var(--shop-text-primary)] shadow-[var(--shop-shadow-sm)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
                >
                  <ShoppingBag className="h-4 w-4" />
                  Continue Shopping
                </Link>
              </div>

              <div className="mt-9 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                {[
                  { icon: ReceiptText, label: 'Order', value: `#${order.order_number}` },
                  { icon: PackageCheck, label: 'Items', value: `${itemCount} item${itemCount === 1 ? '' : 's'}` },
                  { icon: Banknote, label: 'Total', value: formatShopPrice(order.total_amount) },
                  { icon: MapPin, label: 'Delivery', value: order.shipping_address.city },
                ].map((item) => (
                  <div
                    key={item.label}
                    className="rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-4 shadow-[var(--shop-shadow-sm)]"
                  >
                    <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--shop-text-muted)]">
                      <item.icon className="h-4 w-4 text-[var(--shop-gold)]" />
                      {item.label}
                    </div>
                    <div className="mt-2 break-all text-lg font-semibold text-[var(--shop-text-primary)]">{item.value}</div>
                  </div>
                ))}
              </div>
            </div>

            <aside className="relative">
              <div className="relative overflow-hidden rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-3 shadow-[var(--shop-shadow-lg)]">
                <div className="rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
                        <Sparkles className="h-4 w-4" />
                        Flux3D Shop
                      </div>
                      <div className="font-[var(--shop-font-heading)] mt-3 text-2xl font-semibold text-[var(--shop-text-primary)]">Success Receipt</div>
                      <div className="mt-1 text-sm font-medium text-[var(--shop-text-muted)]">
                        {formatShopOrderDateTime(order.placed_at)}
                      </div>
                    </div>
                    <div className="grid h-14 w-14 place-items-center rounded-2xl border border-emerald-200 bg-emerald-50 text-emerald-700 shadow-[var(--shop-shadow-sm)]">
                      <Check className="h-8 w-8" strokeWidth={2.6} />
                    </div>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-white">
                    {primaryImage ? (
                      <div className="relative aspect-[16/10] bg-[var(--shop-bg-muted)]">
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
                          <div className="font-[var(--shop-font-heading)] line-clamp-1 text-lg font-semibold text-[var(--shop-text-primary)]">
                            {order.items[0]?.productName}
                          </div>
                          <div className="mt-1 line-clamp-1 text-sm font-medium text-[var(--shop-text-muted)]">
                            {order.items[0]?.variantLabel}
                          </div>
                        </div>
                      </div>
                    ) : (
                      <div className="grid aspect-[16/10] place-items-center bg-[var(--shop-bg-soft)]">
                        <PackageCheck className="h-16 w-16 text-emerald-600" />
                      </div>
                    )}

                    <div className="grid grid-cols-3 divide-x divide-[var(--shop-border-light)] border-t border-[var(--shop-border-light)] text-center">
                      <div className="px-3 py-4">
                        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--shop-text-muted)]">Status</div>
                        <div className="mt-1 text-sm font-semibold text-emerald-700">{getShopFulfilmentStatusLabel(order.fulfilment_status)}</div>
                      </div>
                      <div className="px-3 py-4">
                        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--shop-text-muted)]">Payment</div>
                        <div className="mt-1 text-sm font-semibold text-[var(--shop-text-primary)]">{getShopPaymentStatusLabel(order.payment_status)}</div>
                      </div>
                      <div className="px-3 py-4">
                        <div className="text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--shop-text-muted)]">Mode</div>
                        <div className="mt-1 text-sm font-semibold text-[var(--shop-text-primary)]">
                          {getPaymentModeLabel(order.payment_provider ?? order.payment_method)}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="mt-5 space-y-3">
                    {previewItems.map((item) => (
                      <div
                        key={`${item.skuId}-${item.customizationText ?? ''}`}
                        className="grid grid-cols-[48px_1fr_auto] items-center gap-3 rounded-[var(--shop-radius-md)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-2.5"
                      >
                        <div className="relative h-12 w-12 overflow-hidden rounded-xl bg-[var(--shop-bg-muted)]">
                          {item.productThumbnail ? (
                            <Image src={item.productThumbnail} alt={item.productName} fill sizes="48px" className="object-cover" />
                          ) : (
                            <div className="grid h-full place-items-center">
                              <PackageCheck className="h-5 w-5 text-[var(--shop-text-muted)]" />
                            </div>
                          )}
                        </div>
                        <div className="min-w-0">
                          <div className="line-clamp-1 text-sm font-semibold text-[var(--shop-text-primary)]">{item.productName}</div>
                          <div className="line-clamp-1 text-xs font-medium text-[var(--shop-text-muted)]">{item.variantLabel}</div>
                        </div>
                        <div className="text-right text-sm font-semibold text-[var(--shop-text-primary)]">x{item.quantity}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </aside>
          </section>

          <section className="rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-5 shadow-[var(--shop-shadow-sm)] md:p-6">
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
                  <CircleDot className="h-4 w-4" />
                  Live Fulfillment
                </div>
                <h2 className="font-[var(--shop-font-heading)] mt-2 text-2xl font-semibold text-[var(--shop-text-primary)]">What happens next</h2>
              </div>
              <Link
                href="/3d-shop/orders"
                className="inline-flex min-h-[46px] items-center justify-center gap-2 rounded-xl border border-[var(--shop-border-light)] bg-white px-4 text-sm font-semibold text-[var(--shop-text-primary)] shadow-[var(--shop-shadow-sm)] transition hover:border-[var(--shop-gold)] hover:text-[var(--shop-gold)]"
              >
                All Shop Orders
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7">
              {timeline.map((step, index) => (
                <div
                  key={step.label}
                  className={`rounded-[var(--shop-radius-lg)] border p-4 ${
                    step.active
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] text-[var(--shop-text-secondary)]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className={`grid h-9 w-9 place-items-center rounded-full border ${
                      step.active ? 'border-emerald-200 bg-emerald-600 text-white' : 'border-[var(--shop-border-light)] bg-white text-[var(--shop-text-muted)]'
                    }`}>
                      {step.active ? <Check className="h-5 w-5" /> : index + 1}
                    </div>
                    {step.active ? (
                      <BadgeCheck className="h-5 w-5 text-emerald-600" />
                    ) : (
                      <Clock3 className="h-5 w-5 text-[var(--shop-text-muted)]" />
                    )}
                  </div>
                  <div className="mt-4 text-base font-semibold">{step.label}</div>
                  <div className="mt-1 text-sm font-medium opacity-70">{step.detail}</div>
                </div>
              ))}
            </div>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {[
                { icon: CalendarClock, label: 'Placed', value: formatShopOrderDateTime(order.placed_at) },
                { icon: Banknote, label: 'Payable', value: `${formatShopPrice(order.total_amount)} on delivery` },
                { icon: MapPin, label: 'Destination', value: `${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.pincode}` },
              ].map((item) => (
                <div key={item.label} className="rounded-[var(--shop-radius-lg)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-soft)] p-4">
                  <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.12em] text-[var(--shop-text-muted)]">
                    <item.icon className="h-4 w-4 text-[var(--shop-gold)]" />
                    {item.label}
                  </div>
                  <div className="mt-2 line-clamp-1 text-sm font-semibold text-[var(--shop-text-primary)]">{item.value}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      </main>
      <ShopOrderTracking
        orderNumber={order.order_number}
        itemIds={order.items.map((i) => i.skuCode)}
        contents={order.items.map((i) => ({ id: i.skuCode, quantity: i.quantity, item_price: i.unitPrice }))}
        value={order.total_amount}
      />
    </ShopShell>
  )
}
