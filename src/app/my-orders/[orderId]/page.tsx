import Link from 'next/link'
import { notFound } from 'next/navigation'
import Navbar from '@/components/Navbar'
import { requireUser } from '@/lib/auth/server'
import {
  formatAddressSummary,
  getOrderStatusClasses,
  getOrderStatusLabel,
  type OrderStatus,
} from '@/lib/orders'
import { createServerSupabaseClient } from '@/lib/supabase/server'

type OrderDetailRow = {
  id: string
  order_number: string | null
  file_url: string
  material: string
  color: string
  infill: number
  layer_height: number
  supports: boolean
  full_name: string
  phone: string
  address_line1: string
  address_line2: string | null
  city: string
  state: string
  pincode: string
  landmark: string | null
  delivery_charge: number
  total_price: number
  price: number
  estimated_time: number
  status: OrderStatus
  notes: string | null
  created_at: string
}

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ orderId: string }>
}) {
  const { orderId } = await params
  const auth = await requireUser(`/my-orders/${orderId}`)
  const supabase = await createServerSupabaseClient()
  const { data: order, error } = await supabase
    .from('orders')
    .select(
      'id, order_number, file_url, material, color, infill, layer_height, supports, full_name, phone, address_line1, address_line2, city, state, pincode, landmark, delivery_charge, total_price, price, estimated_time, status, notes, created_at'
    )
    .eq('id', orderId)
    .eq('user_id', auth.user.id)
    .maybeSingle()

  if (error) {
    throw new Error(error.message)
  }

  if (!order) {
    notFound()
  }

  const row = order as OrderDetailRow
  const addressLines = formatAddressSummary({
    addressLine1: row.address_line1,
    addressLine2: row.address_line2 ?? '',
    city: row.city,
    state: row.state,
    pincode: row.pincode,
    landmark: row.landmark ?? '',
  })

  return (
    <div className="min-h-screen bg-[#050810] px-4 pb-16 pt-28 text-white md:px-8">
      <Navbar transparent />
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="rounded-[32px] border border-white/10 bg-[rgba(9,14,25,0.82)] p-6 backdrop-blur-2xl">
          <Link
            href="/my-orders"
            className="inline-flex text-sm text-[#9ea6c4] transition-colors hover:text-white"
          >
            Back to orders
          </Link>
          <div className="mt-4 flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#7a82a0]">
                Order request
              </div>
              <h1 className="mt-3 font-[var(--font-syne)] text-4xl font-extrabold text-white">
                {row.order_number ?? row.id}
              </h1>
              <p className="mt-3 max-w-2xl text-base leading-8 text-[#9ea6c4]">
                Submitted on{' '}
                {new Date(row.created_at).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'long',
                  year: 'numeric',
                })}
                . This request is inquiry-based and does not include payment.
              </p>
            </div>
            <div
              className={`inline-flex rounded-full border px-4 py-2 text-sm ${getOrderStatusClasses(row.status)}`}
            >
              {getOrderStatusLabel(row.status)}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.3fr_0.9fr]">
          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white">
              Configuration
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">Material</div>
                <div className="mt-2 text-sm text-white">{row.material}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">Color</div>
                <div className="mt-2 text-sm text-white">{row.color}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">Infill</div>
                <div className="mt-2 text-sm text-white">{row.infill}%</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">Layer height</div>
                <div className="mt-2 text-sm text-white">{Number(row.layer_height)} mm</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">Supports</div>
                <div className="mt-2 text-sm text-white">{row.supports ? 'Included' : 'Not required'}</div>
              </div>
              <div className="rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">File</div>
                <div className="mt-2 break-all text-sm text-white">{row.file_url}</div>
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">
                Notes
              </div>
              <div className="mt-2 text-sm leading-7 text-white">
                {row.notes?.trim() ? row.notes : 'No extra instructions were provided.'}
              </div>
            </div>

            <div className="mt-5 rounded-2xl border border-white/10 bg-[#0d1120] px-4 py-4">
              <div className="text-xs uppercase tracking-[0.18em] text-[#7a82a0]">
                Delivery address
              </div>
              <div className="mt-2 text-sm font-medium text-white">
                {row.full_name} · {row.phone}
              </div>
              <div className="mt-2 space-y-1 text-sm leading-7 text-white">
                {addressLines.map((line) => (
                  <div key={line}>{line}</div>
                ))}
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.03] p-6 backdrop-blur-xl">
            <h2 className="font-[var(--font-syne)] text-2xl font-bold text-white">Estimate</h2>
            <div className="mt-5 rounded-[24px] border border-[#FF8A57]/20 bg-[linear-gradient(180deg,rgba(255,92,26,0.12),rgba(255,92,26,0.06))] p-5 shadow-[0_12px_48px_rgba(255,92,26,0.1)]">
              <div className="text-[11px] uppercase tracking-[0.22em] text-[#ffd3c1]">
                Total price
              </div>
              <div className="mt-2 font-[var(--font-syne)] text-4xl font-bold text-white">
                ₹{Number(row.total_price).toFixed(0)}
              </div>
              <div className="mt-4 grid gap-2 text-sm text-[#ffe0d4]">
                <div className="flex justify-between">
                  <span>Print cost</span>
                  <span>₹{Number(row.price).toFixed(0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery charge</span>
                  <span>
                    {Number(row.delivery_charge) === 0
                      ? 'FREE'
                      : `₹${Number(row.delivery_charge).toFixed(0)}`}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span>Estimated print time</span>
                  <span>{Number(row.estimated_time).toFixed(1)} hr</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
