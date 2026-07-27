import type { Metadata } from 'next'
import Image from 'next/image'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import { ArrowLeft, BadgeCheck, CreditCard, MapPin, PackageCheck, ShieldCheck, User } from 'lucide-react'
import ShopShell from '@/components/shop/ShopShell'
import PaymentPageClient from './PaymentPageClient'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { absoluteUrl } from '@/lib/site'
import { getSettings } from '@/lib/settings'
import { buildPublicBusinessProfile } from '@/lib/public-business'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { formatShopPrice } from '@/lib/shop/selection'
import { mapShopOrderRow, type ShopOrder } from '@/lib/shop/orders'

export const dynamic = 'force-dynamic'

type PaymentPageProps = {
  params: Promise<{ orderId: string }>
}

export async function generateMetadata({ params }: PaymentPageProps): Promise<Metadata> {
  const { orderId } = await params
  return {
    title: 'Secure Payment — 3D Shop',
    description: 'Review your Flux3D order summary and complete payment through Razorpay Checkout.',
    alternates: { canonical: absoluteUrl(`/3d-shop/payment/${orderId}`) },
  }
}

async function getOrder(orderId: string, userId: string) {
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

function getItemCount(order: ShopOrder) {
  return order.items.reduce((count, item) => count + item.quantity, 0)
}

function getPrimaryImage(order: ShopOrder) {
  return order.items.find((item) => item.productThumbnail)?.productThumbnail ?? null
}

const SHOP_GOLD_THEME = {
  accent: 'var(--shop-gold)',
  accentFaint: 'var(--shop-gold-faint)',
  accentBorder: 'var(--shop-border-gold)',
  accentText: 'var(--shop-gold)',
  buttonBg: 'var(--shop-text-primary)',
  buttonHoverBg: 'var(--shop-text-secondary)',
  buttonShadow: 'var(--shop-shadow-sm)',
  containerBorder: 'var(--shop-border-light)',
  containerBg: '#ffffff',
  containerRadius: 'var(--shop-radius-xl)',
}

export default async function RazorpayShopPaymentPage({ params }: PaymentPageProps) {
  const { orderId } = await params
  const auth = await getCurrentUserProfile()
  if (!auth) redirect(`/login?next=/3d-shop/payment/${encodeURIComponent(orderId)}`)
  const order = await getOrder(orderId, auth.profile.id)
  if (!order) notFound()

  if (order.payment_status === 'paid') {
    redirect(`/3d-shop/order/${order.id}`)
  }

  const settings = await getSettings()
  const profile = buildPublicBusinessProfile(settings)
  const itemCount = getItemCount(order)
  const primaryImage = getPrimaryImage(order)

  const orderStats = [
    { label: 'Order', value: order.order_number, icon: BadgeCheck },
    { label: 'Items', value: `${itemCount} item${itemCount === 1 ? '' : 's'}`, icon: PackageCheck },
    { label: 'Amount', value: formatShopPrice(order.total_amount), icon: CreditCard },
    { label: 'Delivery', value: order.shipping_address.city, icon: MapPin },
  ]

  return (
    <ShopShell transparentNav>
      <main className="px-4 pb-20 pt-5 md:px-8 lg:px-16">
        <div className="mx-auto max-w-7xl">
          <div className="mb-8">
            <nav className="mb-4 flex flex-wrap items-center gap-2 text-sm text-[var(--shop-text-muted)]">
              <Link href="/" className="transition hover:text-[var(--shop-text-primary)]">Home</Link>
              <span>/</span>
              <Link href="/3d-shop" className="transition hover:text-[var(--shop-text-primary)]">3D Shop</Link>
              <span>/</span>
              <span className="text-[var(--shop-text-primary)]">Payment</span>
            </nav>
            <div className="inline-flex items-center gap-2 rounded-full border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] px-4 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-[var(--shop-gold)]">
              <ShieldCheck className="h-3.5 w-3.5" />
              Secure payment
            </div>
            <h1 className="font-[var(--shop-font-heading)] mt-4 text-[clamp(2rem,6vw,3.5rem)] font-semibold leading-[1.05] tracking-[-0.03em] text-[var(--shop-text-primary)]">
              Complete your payment.
            </h1>
            <p className="mt-3 max-w-2xl text-base leading-8 text-[var(--shop-text-secondary)]">
              The final amount is calculated on the server from the live order record and cannot be changed from the browser.
            </p>
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_420px]">
            <section className="space-y-6">
              <div className="rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-white p-5 shadow-[var(--shop-shadow-sm)]">
                <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {orderStats.map((stat) => {
                    const Icon = stat.icon
                    return (
                      <div key={stat.label} className="rounded-[var(--shop-radius-md)] border border-[var(--shop-border-light)] bg-[var(--shop-bg-elevated)] p-4 shadow-[var(--shop-shadow-sm)]">
                        <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-[var(--shop-text-muted)]">{stat.label}</div>
                        <div className="mt-2 flex items-center gap-2">
                          <Icon className="h-4 w-4 text-[var(--shop-gold)]" />
                          <span className="break-all text-lg font-black text-[var(--shop-text-primary)]">{stat.value}</span>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </div>

              <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
                <div className="overflow-hidden rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-white shadow-[var(--shop-shadow-sm)]">
                  {primaryImage ? (
                    <div className="relative aspect-[16/10] bg-[var(--shop-bg-muted)]">
                      <Image
                        src={primaryImage}
                        alt={order.items[0]?.productName || '3D Shop order item'}
                        fill
                        sizes="(min-width: 1024px) 50vw, 100vw"
                        className="object-cover"
                      />
                      <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(15,23,42,0.75))]" />
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="text-lg font-bold text-white">{order.items[0]?.productName}</div>
                        <div className="mt-1 text-sm font-semibold text-white/80">{order.items[0]?.variantLabel}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="grid aspect-[16/10] place-items-center bg-gradient-to-br from-[var(--shop-gold-faint)] to-[var(--shop-bg-soft)]">
                      <div className="text-sm font-bold text-[var(--shop-gold)]">Flux3D production slot</div>
                    </div>
                  )}
                </div>

                <div className="space-y-4 rounded-[var(--shop-radius-xl)] border border-[var(--shop-border-light)] bg-white p-5 shadow-[var(--shop-shadow-sm)]">
                  <div className="flex items-center gap-3">
                    <span className="grid h-10 w-10 place-items-center rounded-2xl bg-[var(--shop-gold-faint)] text-[var(--shop-gold)]">
                      <User className="h-5 w-5" />
                    </span>
                    <div className="text-xs font-black uppercase tracking-[0.16em] text-[var(--shop-text-muted)]">Checkout details</div>
                  </div>
                  <div className="grid gap-4 text-sm text-[var(--shop-text-secondary)]">
                    <div className="flex items-start justify-between gap-4">
                      <span>Customer</span>
                      <span className="text-right font-semibold text-[var(--shop-text-primary)]">{order.shipping_address.name}</span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span>Address</span>
                      <span className="max-w-[240px] text-right font-semibold text-[var(--shop-text-primary)]">
                        {order.shipping_address.line1}
                        {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''}
                        {`, ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.pincode}`}
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span>Support</span>
                      <span className="text-right font-semibold text-[var(--shop-text-primary)]">
                        <a href={`mailto:${profile.supportEmail}`} className="text-[var(--shop-gold)] underline-offset-4 hover:underline">{profile.supportEmail}</a>
                      </span>
                    </div>
                    <div className="flex items-start justify-between gap-4">
                      <span>Phone</span>
                      <span className="text-right font-semibold text-[var(--shop-text-primary)]">{profile.supportPhone}</span>
                    </div>
                  </div>

                  <div className="rounded-2xl border border-[var(--shop-border-gold)] bg-[var(--shop-gold-faint)] p-4 text-sm leading-7 text-[var(--shop-gold)]">
                    Razorpay Standard Checkout will open in a secure modal. Flux3D only receives the order reference and verification data.
                  </div>
                </div>
              </div>

              <Link
                href="/3d-shop/cart"
                className="inline-flex items-center gap-2 text-sm font-semibold text-[var(--shop-text-secondary)] transition hover:text-[var(--shop-gold)]"
              >
                <ArrowLeft className="h-4 w-4" />
                Back to cart
              </Link>
            </section>

            <aside className="h-fit lg:sticky lg:top-28">
              <PaymentPageClient
                orderId={order.id}
                createOrderEndpoint="/api/payments/razorpay/create-order"
                verifyEndpoint="/api/payments/razorpay/verify"
                statusEndpoint={`/api/payments/status/shop_order/${order.id}`}
                successHref={`/3d-shop/order/${order.id}?payment=success`}
                orderNumber={order.order_number}
                amountPaise={Math.round(Number(order.total_amount) * 100)}
                currency="INR"
                title="Pay securely with Razorpay"
                subtitle="Verify the order once, then complete checkout in a trusted payment modal."
                supportEmail={profile.supportEmail}
                supportPhone={profile.supportPhone}
                customer={{
                  name: order.shipping_address.name,
                  email: auth.profile.email,
                  contact: order.shipping_address.phone,
                }}
                orderSummary={(
                  <div className="grid gap-3 text-sm text-[var(--shop-text-secondary)]">
                    <div className="flex items-center justify-between">
                      <span>Subtotal</span>
                      <span className="font-semibold text-[var(--shop-text-primary)]">{formatShopPrice(order.subtotal)}</span>
                    </div>
                    {order.discount_amount > 0 && (
                      <div className="flex items-center justify-between text-emerald-700">
                        <span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
                        <span className="font-semibold">-{formatShopPrice(order.discount_amount)}</span>
                      </div>
                    )}
                    <div className="flex items-center justify-between">
                      <span>Shipping</span>
                      <span className="font-semibold text-[var(--shop-text-primary)]">{order.shipping_charge === 0 ? 'Free' : formatShopPrice(order.shipping_charge)}</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-[var(--shop-border-light)] pt-3 text-base">
                      <span className="font-black text-[var(--shop-text-primary)]">Total</span>
                      <span className="text-lg font-black text-[var(--shop-text-primary)]">{formatShopPrice(order.total_amount)}</span>
                    </div>
                  </div>
                )}
                themeColor={settings.primaryColor || settings.secondaryColor || '#c9a962'}
                theme={SHOP_GOLD_THEME}
              />
            </aside>
          </div>
        </div>
      </main>
    </ShopShell>
  )
}