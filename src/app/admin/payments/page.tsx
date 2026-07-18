'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { CreditCard, RefreshCcw, Receipt, ScanSearch, Webhook } from 'lucide-react'
import DataTable from '@/components/admin/DataTable'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import type { PaymentData } from '@/lib/admin/types'

type PaymentsResponse = {
  payments: PaymentData[]
  summary: {
    totalCollected: number
    pending: number
    refunded: number
    gatewayFees: number
  }
}

function formatMoney(value: number) {
  return `₹${Math.round(Number(value) || 0).toLocaleString('en-IN')}`
}

function getProviderLabel(provider: string) {
  if (provider === 'razorpay') return 'Razorpay'
  if (provider === 'payu') return 'PayU'
  return provider
}

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentData[] | null>(null)
  const [summary, setSummary] = useState<PaymentsResponse['summary'] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch('/api/admin/payments', { signal: controller.signal })
        if (response.ok) {
          const json = await response.json() as PaymentsResponse
          setPayments(json.payments || [])
          setSummary(json.summary || null)
        }
      } catch (error) {
        if ((error as Error).name === 'AbortError') return
      } finally {
        setLoading(false)
      }
    }

    void load()
    return () => controller.abort()
  }, [])

  const summaryCards = [
    { label: 'Total Collected', value: formatMoney(summary?.totalCollected ?? 0), tone: 'text-emerald-600' },
    { label: 'Pending Confirmations', value: formatMoney(summary?.pending ?? 0), tone: 'text-amber-500' },
    { label: 'Refunded', value: formatMoney(summary?.refunded ?? 0), tone: 'text-rose-500' },
    { label: 'Gateway Fees', value: formatMoney(summary?.gatewayFees ?? 0), tone: 'text-[#6F7192]' },
  ]

  if (loading) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-28 w-full" />
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <SkeletonBlock key={index} className="h-24 w-full" />
          ))}
        </div>
        <SkeletonBlock className="h-[520px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
          <CreditCard className="h-3 w-3" />
          Payments & Refunds
        </div>
        <div className="mt-3 flex items-center justify-between gap-3">
          <div>
            <h1 className="font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Payments</h1>
            <p className="mt-2 max-w-xl text-sm text-[#6F7192]">
              Track payment attempts, provider IDs, capture states, and refunds from one ledger-backed view.
            </p>
          </div>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/10 bg-white px-4 py-2.5 text-sm font-semibold text-[#0F1B3D]"
          >
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </button>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <Link href="/admin/refunds" className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/10 bg-white px-3.5 py-2 text-sm font-semibold text-[#0F1B3D]">
            <Receipt className="h-4 w-4" />
            Refunds
          </Link>
          <Link href="/admin/reconciliation" className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/10 bg-white px-3.5 py-2 text-sm font-semibold text-[#0F1B3D]">
            <ScanSearch className="h-4 w-4" />
            Reconciliation
          </Link>
          <Link href="/admin/webhook-health" className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/10 bg-white px-3.5 py-2 text-sm font-semibold text-[#0F1B3D]">
            <Webhook className="h-4 w-4" />
            Webhook Health
          </Link>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs text-[#6F7192]">{card.label}</p>
            <p className={`mt-1 text-xl font-bold ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DataTable
          title="Payment Ledger"
          description="Ledger rows from the provider-aware payment attempts table."
          data={payments ?? []}
          searchPlaceholder="Search by order number, payment ID, customer..."
          searchKeys={['orderNumber', 'providerOrderId', 'providerPaymentId', 'customer', 'customerEmail', 'internalOrderId']}
          columns={[
            {
              key: 'orderNumber',
              label: 'Order',
              sortable: true,
              render: (row: PaymentData) => (
                <div>
                  <Link href={`/admin/payments/${row.id}`} className="font-medium text-[#0F1B3D] hover:text-[#6d28d9]">{row.orderNumber}</Link>
                  <div className="mt-1 text-xs text-[#6F7192]">{row.internalOrderType.replace('_', ' ')}</div>
                </div>
              ),
            },
            { key: 'customer', label: 'Customer', sortable: true, render: (row: PaymentData) => <span className="text-[#6F7192]">{row.customer}</span> },
            { key: 'amountPaise', label: 'Amount', sortable: true, render: (row: PaymentData) => <span className="font-medium text-[#0F1B3D]">₹{Math.round(row.amountPaise / 100).toLocaleString('en-IN')}</span> },
            { key: 'provider', label: 'Provider', sortable: true, render: (row: PaymentData) => <span className="text-[#6F7192]">{getProviderLabel(row.provider)}</span> },
            { key: 'providerOrderId', label: 'Provider Order', sortable: true, render: (row: PaymentData) => <span className="text-[#6F7192] break-all">{row.providerOrderId ?? '—'}</span> },
            { key: 'providerPaymentId', label: 'Payment ID', sortable: true, render: (row: PaymentData) => <span className="text-[#6F7192] break-all">{row.providerPaymentId ?? '—'}</span> },
            {
              key: 'status',
              label: 'Status',
              sortable: true,
              render: (row: PaymentData) => (
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                  row.status === 'paid' || row.status === 'captured'
                    ? 'bg-emerald-100 text-emerald-700'
                    : row.status === 'pending' || row.status === 'created' || row.status === 'authorized'
                      ? 'bg-amber-100 text-amber-700'
                      : row.status === 'refunded' || row.status === 'partially_refunded'
                        ? 'bg-rose-100 text-rose-700'
                        : 'bg-gray-100 text-gray-700'
                }`}>
                  {row.status}
                </span>
              ),
            },
            { key: 'paymentMethod', label: 'Method', sortable: true, render: (row: PaymentData) => <span className="text-[#6F7192]">{row.paymentMethod ?? '—'}</span> },
            { key: 'createdAt', label: 'Created', sortable: true, render: (row: PaymentData) => <span className="text-[#6F7192]">{new Date(row.createdAt).toLocaleString('en-IN')}</span> },
          ]}
        />
      </motion.div>
    </div>
  )
}
