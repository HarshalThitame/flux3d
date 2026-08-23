import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { BadgeCheck, CheckCircle2, Clock, MapPin, Package, PackageCheck, Truck, XCircle } from 'lucide-react'
import ShopShell from '@/components/shop/ShopShell'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { mapShopOrderRow, type ShopOrder } from '@/lib/shop/orders'
import { verifyGuestOrderAccess } from '@/lib/shop/guest-access'
import { getSettings } from '@/lib/settings'
import { formatShopPrice } from '@/lib/shop/selection'
import GuestAccountNudge from './GuestAccountNudge'

export const dynamic = 'force-dynamic'

type TrackPageProps = {
  params: Promise<{ orderId: string }>
  searchParams: Promise<{ token?: string; claimed?: string }>
}

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Track your order — Flux3D',
    robots: { index: false, follow: false },
  }
}

const TIMELINE: Array<{ key: string; label: string; icon: typeof Package }> = [
  { key: 'placed', label: 'Order placed', icon: PackageCheck },
  { key: 'confirmed', label: 'Confirmed', icon: BadgeCheck },
  { key: 'packed', label: 'Packed', icon: Package },
  { key: 'shipped', label: 'Shipped', icon: Truck },
  { key: 'delivered', label: 'Delivered', icon: CheckCircle2 },
]

const ORDER_STATUS_INDEX: Record<string, number> = {
  placed: 0,
  confirmed: 1,
  packed: 2,
  shipped: 3,
  delivered: 4,
}

function StatusTimeline({ order }: { order: ShopOrder }) {
  const cancelled = order.order_status === 'cancelled' || order.order_status.startsWith('return')
  const currentIndex = ORDER_STATUS_INDEX[order.order_status] ?? 0

  if (cancelled) {
    return (
      <div className="mt-5 flex items-center gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-700">
        <XCircle className="h-5 w-5 shrink-0" />
        <div>
          This order was cancelled.
          {order.cancellation_reason ? ` Reason: ${order.cancellation_reason}` : ''}
        </div>
      </div>
    )
  }

  return (
    <ol className="mt-5 grid gap-3 sm:grid-cols-5">
      {TIMELINE.map((step, index) => {
        const done = index <= currentIndex
        const Icon = step.icon
        return (
          <li
            key={step.key}
            className={`flex items-center gap-2 rounded-xl border p-3 text-xs font-bold ${
              done
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                : 'border-[var(--shop-border-light)] bg-white text-[var(--shop-text-muted)]'
            }`}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {step.label}
          </li>
        )
      })}
    </ol>
  )
}

export default async function TrackOrderPage({ params, searchParams }: TrackPageProps) {
  const { orderId } = await params
  const { token, claimed } = await searchParams

  // Token-gated access: no valid token, no order data. Unknown tokens and
  // unknown order ids are indistinguishable (both 404).
  const access = await verifyGuestOrderAccess(orderId, token ?? '')
  if (!access) notFound()

  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('shelf_orders')
    .select('*')
    .eq('id', orderId)
    .maybeSingle()

  if (error || !data) notFound()

  const order = mapShopOrderRow(data)

  // If the guest has since claimed this order into an account, celebrate (or
  // ask them to log in to see it).
  if (order.user_id) {
    const auth = await getCurrentUserProfile()

    if (auth) {
      // Just came back from the magic link — success state.
      return (
        <ShopShell transparentNav>
          <main className="px-4 pb-20 pt-10 md:px-8 lg:px-16">
            <div className="mx-auto max-w-2xl rounded-[var(--shop-radius-xl)] border border-emerald-200 bg-emerald-50 p-8 text-center shadow-[var(--shop-shadow-sm)]">
              <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
              <h1 className="mt-4 text-2xl font-bold text-[var(--shop-text-primary)]">
                {claimed === '1' ? 'Order saved to your account!' : 'You are logged in'}
              </h1>
              <p className="mt-2 text-sm text-[var(--shop-text-secondary)]">
                {order.order_number} and any other guest orders with this email now live in your account —
                with live status, invoices and returns.
              </p>
              <div className="mt-6 flex flex-col justify-center gap-3 sm:flex-row">
                <Link
                  href="/my-orders"
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[var(--shop-text-primary)] px-6 text-sm font-semibold text-white"
                >
                  Go to my orders
                </Link>
                <Link
                  href={`/3d-shop/order/${order.id}`}
                  className="inline-flex min-h-[48px] items-center justify-center rounded-xl border border-[var(--shop-border-light)] bg-white px-6 text-sm font-semibold text-[var(--shop-text-primary)]"
                >
                  View this order
                </Link>
              </div>
            </div>
          </main>
        </ShopShell>
      )
    }

    return (
      <ShopShell transparentNav>
        <main className="px-4 pb-20 pt-10 md:px-8 lg:px-16">
          <div className="mx-auto max-w-2xl rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-white p-8 text-center shadow-[var(--shop-shadow-sm)]">
            <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
            <h1 className="mt-4 text-2xl font-bold text-[var(--shop-text-primary)]">This order is in your account</h1>
            <p className="mt-2 text-sm text-[var(--shop-text-secondary)]">
              Log in to view live status, invoices and returns for {order.order_number}.
            </p>
            <Link
              href={`/login?next=%2F3d-shop%2Forder%2F${encodeURIComponent(order.id)}`}
              className="mt-6 inline-flex min-h-[48px] items-center justify-center rounded-xl bg-[var(--shop-text-primary)] px-6 text-sm font-semibold text-white"
            >
              Log in to continue
            </Link>
          </div>
        </main>
      </ShopShell>
    )
  }

  const settings = await getSettings()
  const supportEmail = settings.supportEmail

  return (
    <ShopShell transparentNav>
      <main className="px-4 pb-20 pt-5 md:px-8 lg:px-16">
        <div className="mx-auto max-w-3xl space-y-6">
          <div>
            <p className="text-sm font-semibold text-[var(--shop-gold)]">Order tracking</p>
            <h1 className="font-[var(--shop-font-heading)] mt-2 text-[clamp(1.8rem,5vw,2.75rem)] font-semibold text-[var(--shop-text-primary)]">
              {order.order_number}
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm text-[var(--shop-text-secondary)]">
              <span className="inline-flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Placed {new Date(order.placed_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
              <span className="font-bold text-[var(--shop-text-primary)]">{formatShopPrice(order.total_amount)}</span>
              <span>Payment: {order.payment_status}</span>
            </p>
          </div>

          <section className="rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-white p-5 shadow-[var(--shop-shadow-sm)]">
            <h2 className="text-lg font-bold text-[var(--shop-text-primary)]">Status</h2>
            <StatusTimeline order={order} />
            {order.tracking_number && (
              <div className="mt-4 rounded-2xl bg-[var(--shop-bg-soft)] p-4 text-sm text-[var(--shop-text-secondary)]">
                Courier: <span className="font-bold text-[var(--shop-text-primary)]">{order.courier_name ?? '—'}</span>
                {' · '}
                Tracking: <span className="font-bold text-[var(--shop-text-primary)]">{order.tracking_number}</span>
                {order.tracking_url && (
                  <>
                    {' · '}
                    <a href={order.tracking_url} target="_blank" rel="noreferrer" className="font-bold text-[var(--shop-gold)] underline underline-offset-4">
                      Track at courier
                    </a>
                  </>
                )}
              </div>
            )}
          </section>

          <section className="rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-white p-5 shadow-[var(--shop-shadow-sm)]">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--shop-text-primary)]">
              <Package className="h-5 w-5 text-[var(--shop-gold)]" />
              Items
            </h2>
            <ul className="mt-4 divide-y divide-[var(--shop-border-light)]">
              {order.items.map((item, index) => (
                <li key={`${item.skuId}-${index}`} className="flex items-start justify-between gap-4 py-3 text-sm">
                  <div className="min-w-0">
                    <div className="font-semibold text-[var(--shop-text-primary)]">{item.productName}</div>
                    {item.variantLabel && <div className="mt-0.5 text-xs text-[var(--shop-text-muted)]">{item.variantLabel}</div>}
                    <div className="mt-0.5 text-xs text-[var(--shop-text-secondary)]">Qty {item.quantity}</div>
                  </div>
                  <div className="shrink-0 font-extrabold text-[var(--shop-text-primary)]">
                    {formatShopPrice(item.unitPrice * item.quantity)}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-white p-5 shadow-[var(--shop-shadow-sm)]">
            <h2 className="flex items-center gap-2 text-lg font-bold text-[var(--shop-text-primary)]">
              <MapPin className="h-5 w-5 text-[var(--shop-gold)]" />
              Delivery address
            </h2>
            <address className="mt-3 text-sm not-italic leading-6 text-[var(--shop-text-secondary)]">
              {order.shipping_address.name}
              <br />
              {order.shipping_address.line1}
              {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''}
              <br />
              {order.shipping_address.city}, {order.shipping_address.state} {order.shipping_address.pincode}
              <br />
              Phone: {order.shipping_address.phone}
            </address>
            {supportEmail && (
              <p className="mt-4 text-xs text-[var(--shop-text-muted)]">
                Questions about this order? Email{' '}
                <a href={`mailto:${supportEmail}`} className="font-semibold text-[var(--shop-gold)] underline underline-offset-4">
                  {supportEmail}
                </a>{' '}
                and quote {order.order_number}.
              </p>
            )}
          </section>

          <GuestAccountNudge orderId={order.id} emailHint="" trackingUrl={`/3d-shop/track/${order.id}?token=${encodeURIComponent(token ?? '')}`} />
        </div>
      </main>
    </ShopShell>
  )
}
