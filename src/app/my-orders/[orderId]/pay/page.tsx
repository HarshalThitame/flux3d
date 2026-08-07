import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import Navbar from '@/components/Navbar'
import RazorpayCheckoutClient from '@/components/payments/RazorpayCheckoutClient'
import { createAdminSupabaseClient } from '@/lib/admin/server'
import { getCurrentUserProfile } from '@/lib/auth/server'
import { buildPublicBusinessProfile } from '@/lib/public-business'
import { absoluteUrl } from '@/lib/site'
import { getSettings } from '@/lib/settings'
import { formatAddressSummary } from '@/lib/orders'

export const dynamic = 'force-dynamic'

type PaymentPageProps = {
  params: Promise<{ orderId: string }>
}

type QuoteOrderRow = {
  id: string
  order_number: string | null
  group_id: string | null
  file_url: string
  material: string
  color: string
  quantity: number
  subtotal: number
  delivery_charge: number
  total_price: number
  final_price: number | null
  grand_total: number | null
  full_name: string
  phone: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  pincode: string
  landmark: string | null
  estimated_time: number
  status: string
  payment_status: string
  payment_provider: string | null
  payment_method: string | null
  payment_currency: string | null
  payment_amount_paise: number | null
  created_at: string
}

async function getOrder(orderId: string, userId: string) {
  const supabase = createAdminSupabaseClient()
  const { data, error } = await supabase
    .from('orders')
    .select('*')
    .eq('id', orderId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw new Error(error.message)
  return data as QuoteOrderRow | null
}

export async function generateMetadata({ params }: PaymentPageProps): Promise<Metadata> {
  const { orderId } = await params
  return {
    title: 'Secure Razorpay Payment',
    description: 'Review your Flux3D custom order and complete payment through Razorpay Checkout.',
    alternates: { canonical: absoluteUrl(`/my-orders/${orderId}/pay`) },
  }
}

export default async function QuotePaymentPage({ params }: PaymentPageProps) {
  const auth = await getCurrentUserProfile()
  if (!auth) redirect('/login')

  const { orderId } = await params
  const order = await getOrder(orderId, auth.profile.id)
  if (!order) notFound()

  if (order.payment_status === 'paid') {
    redirect(`/my-orders/${order.id}`)
  }

  const settings = await getSettings()
  const profile = buildPublicBusinessProfile(settings)
  const addressSummary = formatAddressSummary({
    addressLine1: order.address_line1,
    addressLine2: order.address_line2 ?? '',
    city: order.city,
    state: order.state,
    pincode: order.pincode,
    landmark: order.landmark ?? '',
  })
  const amountPaise = Math.round(Number(order.grand_total ?? order.total_price) * 100)

  return (
    <div className="min-h-screen bg-[#f9f7f4] text-[#070b1d]">
      <Navbar />
      <main className="mx-auto grid min-h-[calc(100vh-5rem)] max-w-7xl gap-6 px-4 py-8 lg:grid-cols-[minmax(0,1.08fr)_420px]">
        <section className="overflow-hidden rounded-[32px] border border-gray-200 bg-white p-6 shadow-lg">
          <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700">
            Custom quote payment
          </div>
          <h1 className="mt-5 text-[clamp(2.4rem,5vw,4.9rem)] font-black leading-[0.94] tracking-[-0.03em] text-[#070b1d]">
            Secure your production slot.
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-8 text-gray-600">
            Flux3D recalculates the payable amount on the server and opens a Razorpay checkout for the exact order reference.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="rounded-3xl border border-gray-200 bg-[#faf9f7] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Order</div>
              <div className="mt-2 break-all text-lg font-black text-[#070b1d]">{order.order_number ?? order.id}</div>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-[#faf9f7] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Material</div>
              <div className="mt-2 text-lg font-black text-[#070b1d]">{order.material}</div>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-[#faf9f7] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Amount</div>
              <div className="mt-2 text-lg font-black text-[#070b1d]">₹{Math.round(amountPaise / 100).toLocaleString('en-IN')}</div>
            </div>
            <div className="rounded-3xl border border-gray-200 bg-[#faf9f7] p-4">
              <div className="text-[10px] font-bold uppercase tracking-[0.18em] text-gray-500">Status</div>
              <div className="mt-2 text-lg font-black text-[#070b1d]">{order.status}</div>
            </div>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-[28px] border border-gray-200 bg-[#faf9f7] p-5">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Print summary</div>
              <div className="mt-4 grid gap-3 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Color</span>
                  <span className="font-semibold text-[#070b1d]">{order.color}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Quantity</span>
                  <span className="font-semibold text-[#070b1d]">{order.quantity}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Delivery</span>
                  <span className="font-semibold text-[#070b1d]">{order.delivery_charge === 0 ? 'Free' : `₹${Math.round(order.delivery_charge).toLocaleString('en-IN')}`}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>ETA</span>
                  <span className="font-semibold text-[#070b1d]">{order.estimated_time} hrs</span>
                </div>
              </div>
            </div>

            <div className="rounded-[28px] border border-gray-200 bg-[#faf9f7] p-5">
              <div className="text-xs font-black uppercase tracking-[0.16em] text-gray-500">Delivery address</div>
              <div className="mt-4 text-sm leading-7 text-gray-600">
                {addressSummary.map((line) => (
                  <div key={line} className="text-[#070b1d]">{line}</div>
                ))}
              </div>
              <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-7 text-emerald-700">
                Production starts only after the gateway confirms capture.
              </div>
            </div>
          </div>
        </section>

        <aside>
          <RazorpayCheckoutClient
            internalOrderType="custom_quote"
            internalOrderId={order.id}
            createOrderEndpoint="/api/payments/razorpay/create-order"
            verifyEndpoint="/api/payments/razorpay/verify"
            statusEndpoint={`/api/payments/status/custom_quote/${order.id}`}
            successHref={`/my-orders/${order.id}?payment=success`}
            orderNumber={order.order_number ?? order.id}
            amountPaise={amountPaise}
            currency={order.payment_currency || 'INR'}
            title="Pay securely with Razorpay"
            subtitle="The verified amount is locked to the saved quote and cannot be changed in the browser."
            supportEmail={profile.supportEmail}
            supportPhone={profile.supportPhone}
            customer={{
              name: order.full_name,
              email: auth.profile.email,
              contact: order.phone,
            }}
            orderSummary={(
              <div className="grid gap-3 text-sm text-gray-600">
                <div className="flex items-center justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold text-[#070b1d]">₹{Math.round(order.subtotal).toLocaleString('en-IN')}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>Delivery</span>
                  <span className="font-semibold text-[#070b1d]">{order.delivery_charge === 0 ? 'Free' : `₹${Math.round(order.delivery_charge).toLocaleString('en-IN')}`}</span>
                </div>
                <div className="border-t border-gray-200 pt-3 flex items-center justify-between text-base">
                  <span className="font-black text-[#070b1d]">Total</span>
                  <span className="text-lg font-black text-[#070b1d]">₹{Math.round(Number(order.grand_total ?? order.total_price)).toLocaleString('en-IN')}</span>
                </div>
              </div>
            )}
            themeColor={settings.primaryColor || settings.secondaryColor || '#6d28d9'}
          />
        </aside>
      </main>
    </div>
  )
}
