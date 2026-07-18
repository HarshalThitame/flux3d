import type { Metadata } from 'next'
import { redirect, notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import RazorpayCheckoutClient from '@/components/payments/RazorpayCheckoutClient'
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
    title: 'Secure Razorpay Payment',
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

export default async function RazorpayShopPaymentPage({ params }: PaymentPageProps) {
  const auth = await getCurrentUserProfile()
  if (!auth) redirect('/login')

  const { orderId } = await params
  const order = await getOrder(orderId, auth.profile.id)
  if (!order) notFound()

  if (order.payment_status === 'paid') {
    redirect(`/3d-shop/order/${order.id}`)
  }

  const settings = await getSettings()
  const profile = buildPublicBusinessProfile(settings)
  const itemCount = getItemCount(order)
  const primaryImage = getPrimaryImage(order)

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(14,165,233,0.16),_transparent_34%),linear-gradient(180deg,#020617_0%,#0f172a_46%,#111827_100%)] text-white">
      <Navbar transparent />
      <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1.08fr)_420px]">
        <section className="overflow-hidden rounded-[32px] border border-white/10 bg-white/5 p-6 shadow-[0_24px_100px_rgba(0,0,0,0.26)] backdrop-blur-2xl">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-emerald-200">
            Secure payment
          </div>
          <h1 className="mt-5 text-[clamp(2.4rem,5vw,4.9rem)] font-black leading-[0.94] tracking-[-0.03em] text-white">
            Complete payment with Razorpay.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-slate-300">
            The final amount is calculated on the server from the live order record and cannot be changed from the browser.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Order</div>
              <div className="mt-2 break-all text-lg font-black text-white">{order.order_number}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Items</div>
              <div className="mt-2 text-lg font-black text-white">{itemCount} item{itemCount === 1 ? '' : 's'}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Amount</div>
              <div className="mt-2 text-lg font-black text-white">{formatShopPrice(order.total_amount)}</div>
            </div>
            <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">Delivery</div>
              <div className="mt-2 text-lg font-black text-white">{order.shipping_address.city}</div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="overflow-hidden rounded-[28px] border border-white/10 bg-black/25">
              {primaryImage ? (
                <div className="relative aspect-[16/10] bg-slate-900">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={primaryImage}
                    alt={order.items[0]?.productName || '3D Shop order item'}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 bg-[linear-gradient(180deg,transparent_40%,rgba(2,6,23,0.9))]" />
                  <div className="absolute bottom-4 left-4 right-4">
                    <div className="text-lg font-black text-white">{order.items[0]?.productName}</div>
                    <div className="mt-1 text-sm font-semibold text-slate-300">{order.items[0]?.variantLabel}</div>
                  </div>
                </div>
              ) : (
                <div className="grid aspect-[16/10] place-items-center bg-[linear-gradient(135deg,rgba(14,165,233,0.18),rgba(34,197,94,0.16))]">
                  <div className="text-sm font-bold text-slate-100">Flux3D production slot</div>
                </div>
              )}
            </div>

            <div className="space-y-3 rounded-[28px] border border-white/10 bg-black/25 p-5">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-slate-400">Checkout details</div>
              <div className="grid gap-4 text-sm text-slate-300">
                <div className="flex items-start justify-between gap-4">
                  <span>Customer</span>
                  <span className="text-right font-semibold text-white">{order.shipping_address.name}</span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span>Address</span>
                  <span className="max-w-[240px] text-right font-semibold text-white">
                    {order.shipping_address.line1}
                    {order.shipping_address.line2 ? `, ${order.shipping_address.line2}` : ''}
                    {`, ${order.shipping_address.city}, ${order.shipping_address.state} ${order.shipping_address.pincode}`}
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span>Support</span>
                  <span className="text-right font-semibold text-white">
                    <a href={`mailto:${profile.supportEmail}`} className="underline-offset-4 hover:underline">{profile.supportEmail}</a>
                  </span>
                </div>
                <div className="flex items-start justify-between gap-4">
                  <span>Phone</span>
                  <span className="text-right font-semibold text-white">{profile.supportPhone}</span>
                </div>
              </div>

              <div className="rounded-2xl border border-emerald-400/15 bg-emerald-400/10 p-4 text-sm leading-7 text-emerald-50">
                Razorpay Standard Checkout will open in a secure modal. Flux3D only receives the order reference and verification data.
              </div>
            </div>
          </div>
        </section>

        <aside>
          <RazorpayCheckoutClient
            internalOrderType="shop_order"
            internalOrderId={order.id}
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
              <div className="grid gap-3 text-sm text-slate-200">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-white">{formatShopPrice(order.subtotal)}</span>
                </div>
                {order.discount_amount > 0 && (
                  <div className="flex items-center justify-between text-emerald-200">
                    <span>Discount{order.coupon_code ? ` (${order.coupon_code})` : ''}</span>
                    <span className="font-semibold">-{formatShopPrice(order.discount_amount)}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span>Shipping</span>
                  <span className="font-semibold text-white">{order.shipping_charge === 0 ? 'Free' : formatShopPrice(order.shipping_charge)}</span>
                </div>
                <div className="border-t border-white/10 pt-3 flex items-center justify-between text-base">
                  <span className="font-black text-white">Total</span>
                  <span className="text-lg font-black text-white">{formatShopPrice(order.total_amount)}</span>
                </div>
              </div>
            )}
            themeColor={settings.primaryColor || settings.secondaryColor || '#0f172a'}
          />
        </aside>
      </main>
    </div>
  )
}
