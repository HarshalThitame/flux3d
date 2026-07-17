import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect, notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { absoluteUrl } from '@/lib/site'
import { buildPublicBusinessProfile } from '@/lib/public-business'
import { getPayuConfig, buildPayuCheckoutFields } from '@/lib/payu'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { getSettings } from '@/lib/settings'
import { mapShopOrderRow, type ShopOrder } from '@/lib/shop/orders'
import { formatShopPrice } from '@/lib/shop/selection'
import PayuPaymentClient from './PayuPaymentClient'

export const dynamic = 'force-dynamic'

type PaymentPageProps = {
  params: Promise<{ orderId: string }>
}

export async function generateMetadata({ params }: PaymentPageProps): Promise<Metadata> {
  const { orderId } = await params
  return {
    title: 'Secure PayU Payment',
    description: 'Review your Flux3D order summary and complete payment through the PayU checkout flow.',
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

export default async function PayuPaymentPage({ params }: PaymentPageProps) {
  const auth = await getCurrentUserProfile()
  if (!auth) redirect('/login')

  const { orderId } = await params
  const order = await getOrder(orderId, auth.profile.id)
  if (!order) notFound()

  const config = getPayuConfig()
  const settings = await getSettings()
  const profile = buildPublicBusinessProfile(settings)

  if (!config) {
    return (
      <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
        <Navbar transparent />
        <main className="mx-auto flex min-h-[70vh] max-w-3xl flex-col justify-center px-4 py-16">
          <div className="rounded-3xl border border-[var(--border-light)] bg-white p-8 shadow-[var(--shadow-sm)]">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-primary)]">PayU not configured</p>
            <h1 className="mt-3 text-3xl font-extrabold text-[var(--text-primary)]">Payment is temporarily unavailable.</h1>
            <p className="mt-4 text-[var(--text-secondary)]">
              The order was created, but PayU credentials are not available in this environment yet. Please contact support or try again after the payment configuration is published.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/contact" className="rounded-xl bg-[var(--brand-primary)] px-5 py-3 text-sm font-bold text-white">
                Contact support
              </Link>
              <Link href={`/3d-shop/order/${order.id}`} className="rounded-xl border border-[var(--border-light)] bg-white px-5 py-3 text-sm font-bold text-[var(--text-primary)]">
                View order
              </Link>
            </div>
          </div>
        </main>
      </div>
    )
  }

  const checkoutFields = buildPayuCheckoutFields(order, profile, config)

  return (
    <div className="min-h-screen bg-[var(--bg-base)] text-[var(--text-primary)]">
      <Navbar transparent />
      <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-6xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1fr)_420px]">
        <section className="rounded-3xl border border-[var(--border-light)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[var(--brand-primary)]">Secure payment</p>
          <h1 className="mt-2 text-3xl font-extrabold text-[var(--text-primary)]">Complete payment through PayU</h1>
          <p className="mt-3 max-w-2xl text-sm leading-7 text-[var(--text-secondary)]">
            Review the order summary below, confirm that the amount and delivery details are correct, and proceed to PayU. The order amount is fixed on the server and cannot be changed from the browser.
          </p>

          <div className="mt-6 grid gap-4 rounded-2xl bg-[var(--bg-soft)] p-5 md:grid-cols-2">
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Order number</div>
              <div className="mt-1 text-lg font-black text-[var(--text-primary)]">{order.order_number}</div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Amount payable</div>
              <div className="mt-1 text-lg font-black text-[var(--text-primary)]">{formatShopPrice(order.total_amount)}</div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Billing type</div>
              <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">INR · Secure online payment</div>
            </div>
            <div>
              <div className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Items</div>
              <div className="mt-1 text-sm font-semibold text-[var(--text-primary)]">{getItemCount(order)} item{getItemCount(order) === 1 ? '' : 's'}</div>
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--border-light)] bg-white p-5">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">PayU payment summary</h2>
            <dl className="mt-4 grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Product</dt>
                <dd className="mt-1 text-sm text-[var(--text-secondary)]">{checkoutFields.productinfo}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Customer</dt>
                <dd className="mt-1 text-sm text-[var(--text-secondary)]">{checkoutFields.firstname}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Support email</dt>
                <dd className="mt-1 text-sm text-[var(--text-secondary)]">
                  <a href={`mailto:${profile.supportEmail}`} className="text-[var(--brand-primary)] underline-offset-4 hover:underline">
                    {profile.supportEmail}
                  </a>
                </dd>
              </div>
              <div>
                <dt className="text-xs font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Terms</dt>
                <dd className="mt-1 text-sm text-[var(--text-secondary)]">
                  <Link href="/terms-and-conditions" className="text-[var(--brand-primary)] underline-offset-4 hover:underline">
                    Terms &amp; Conditions
                  </Link>
                  {' · '}
                  <Link href="/refund-policy" className="text-[var(--brand-primary)] underline-offset-4 hover:underline">
                    Refund Policy
                  </Link>
                </dd>
              </div>
            </dl>
          </div>

          <div className="mt-6 rounded-2xl border border-[var(--border-light)] bg-white p-5">
            <h2 className="text-lg font-bold text-[var(--text-primary)]">What happens next</h2>
            <ul className="mt-4 space-y-3 text-sm leading-7 text-[var(--text-secondary)]">
              <li>1. You confirm the amount and accept the public policies.</li>
              <li>2. Flux 3D records your consent and sends the transaction to PayU.</li>
              <li>3. PayU verifies the payment and redirects you back after the gateway response is checked server-side.</li>
              <li>4. Your order remains on file even if payment is pending or fails, so you can retry from the order page.</li>
            </ul>
          </div>
        </section>

        <aside className="rounded-3xl border border-[var(--border-light)] bg-white p-6 shadow-[var(--shadow-sm)]">
          <PayuPaymentClient
            actionUrl={config.paymentUrl}
            fields={checkoutFields}
            orderId={order.id}
            orderNumber={order.order_number}
            amount={order.total_amount}
            totalItems={getItemCount(order)}
            supportEmail={profile.supportEmail}
            supportPhone={profile.supportPhone}
          />
        </aside>
      </main>
    </div>
  )
}
