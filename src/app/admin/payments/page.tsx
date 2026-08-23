'use client'

import { useCallback, useEffect, useState } from 'react'
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
  page: number
  limit: number
  total: number
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
  const [page, setPage] = useState(1)
  const [total, setTotal] = useState(0)
  const [statusFilter, setStatusFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      params.set('limit', '50')
      if (statusFilter) params.set('status', statusFilter)
      if (dateFrom) params.set('date_from', dateFrom)
      if (dateTo) params.set('date_to', dateTo)

      const response = await fetch(`/api/admin/payments?${params.toString()}`)
      if (response.ok) {
        const json = await response.json() as PaymentsResponse
        setPayments(json.payments || [])
        setSummary(json.summary || null)
        setTotal(json.total ?? 0)
      }
    } catch {
      // ignore abort
    } finally {
      setLoading(false)
    }
  }, [page, statusFilter, dateFrom, dateTo])

  useEffect(() => {
    window.setTimeout(() => void load(), 0)
  }, [load])

  const totalPages = Math.max(1, Math.ceil(total / 50))
  const summaryCards = [
    { label: 'Total Collected', value: formatMoney(summary?.totalCollected ?? 0), tone: 'text-emerald-600' },
    { label: 'Pending Confirmations', value: formatMoney(summary?.pending ?? 0), tone: 'text-amber-500' },
    { label: 'Refunded', value: formatMoney(summary?.refunded ?? 0), tone: 'text-rose-500' },
    { label: 'Gateway Fees', value: formatMoney(summary?.gatewayFees ?? 0), tone: 'text-[#6F7192]' },
  ]

  if (loading && !payments) {
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
            <Receipt className="h-4 w-4" /> Refunds
          </Link>
          <Link href="/admin/reconciliation" className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/10 bg-white px-3.5 py-2 text-sm font-semibold text-[#0F1B3D]">
            <ScanSearch className="h-4 w-4" /> Reconciliation
          </Link>
          <Link href="/admin/webhook-health" className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/10 bg-white px-3.5 py-2 text-sm font-semibold text-[#0F1B3D]">
            <Webhook className="h-4 w-4" /> Webhook Health
          </Link>
        </div>
      </motion.div>

      <div className="flex flex-wrap items-center gap-3">
        <select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value); setPage(1) }}
          className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none">
          <option value="">All statuses</option>
          <option value="paid">Paid</option>
          <option value="captured">Captured</option>
          <option value="pending">Pending</option>
          <option value="authorized">Authorized</option>
          <option value="failed">Failed</option>
          <option value="refunded">Refunded</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <input type="date" value={dateFrom} onChange={(e) => { setDateFrom(e.target.value); setPage(1) }}
          className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none" placeholder="From" />
        <input type="date" value={dateTo} onChange={(e) => { setDateTo(e.target.value); setPage(1) }}
          className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none" placeholder="To" />
      </div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-gray-200 bg-white p-5">
            <p className="text-xs text-[#6F7192]">{card.label}</p>
            <p className={`mt-1 text-xl font-bold ${card.tone}`}>{card.value}</p>
          </div>
        ))}
      </motion.div>

      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}>
        <DataTable
          title="Payment Ledger"
          description="Ledger rows from the provider-aware payment attempts table."
          data={payments ?? []}
          searchPlaceholder="Search by order number, payment ID, customer..."
          searchKeys={['orderNumber', 'providerOrderId', 'providerPaymentId', 'internalOrderId', 'customer', 'customerEmail']}
          exportFilename="payment-ledger.csv"
          columns={[
            {
              key: 'orderNumber', label: 'Order', sortable: true, exportValue: (row: PaymentData) => row.orderNumber,
              render: (row: PaymentData) => (
                <div>
                  <Link href={`/admin/payments/${row.id}`} className="font-medium text-[#0F1B3D] hover:text-[#6d28d9]">{row.orderNumber}</Link>
                  <div className="mt-1 text-xs text-[#6F7192]">{row.internalOrderType.replace('_', ' ')}</div>
                </div>
              ),
            },
            { key: 'amountPaise', label: 'Amount', sortable: true, exportValue: (row: PaymentData) => (row.amountPaise / 100).toFixed(2), render: (row: PaymentData) => <span className="font-medium text-[#0F1B3D]">₹{Math.round(row.amountPaise / 100).toLocaleString('en-IN')}</span> },
            {
              key: 'customer', label: 'Customer', sortable: true,
              exportValue: (row: PaymentData) => row.customerEmail ? `${row.customer} <${row.customerEmail}>` : row.customer,
              render: (row: PaymentData) => (
                <div>
                  <div className="font-medium text-[#0F1B3D]">{row.customer}</div>
                  {row.customerEmail && <div className="mt-0.5 text-xs text-[#6F7192] break-all">{row.customerEmail}</div>}
                  {!row.customerEmail && !row.customerId && <span className="mt-0.5 inline-block rounded-full border border-amber-200 bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700">Guest</span>}
                </div>
              ),
            },
            { key: 'provider', label: 'Provider', sortable: true, exportValue: (row: PaymentData) => getProviderLabel(row.provider), render: (row: PaymentData) => <span className="text-[#6F7192]">{getProviderLabel(row.provider)}</span> },
            { key: 'providerOrderId', label: 'Provider Order', sortable: true, exportValue: (row: PaymentData) => row.providerOrderId ?? '', render: (row: PaymentData) => <span className="text-[#6F7192] break-all">{row.providerOrderId ?? '—'}</span> },
            { key: 'providerPaymentId', label: 'Payment ID', sortable: true, exportValue: (row: PaymentData) => row.providerPaymentId ?? '', render: (row: PaymentData) => <span className="text-[#6F7192] break-all">{row.providerPaymentId ?? '—'}</span> },
            {
              key: 'status', label: 'Status', sortable: true, exportValue: (row: PaymentData) => row.status,
              render: (row: PaymentData) => (
                <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                  row.status === 'paid' || row.status === 'captured' ? 'bg-emerald-100 text-emerald-700'
                    : ['pending', 'created', 'authorized'].includes(row.status) ? 'bg-amber-100 text-amber-700'
                      : ['refunded', 'partially_refunded'].includes(row.status) ? 'bg-rose-100 text-rose-700'
                        : 'bg-gray-100 text-gray-700'
                }`}>{row.status}</span>
              ),
            },
            { key: 'paymentMethod', label: 'Method', sortable: true, exportValue: (row: PaymentData) => row.paymentMethod ?? '', render: (row: PaymentData) => <span className="text-[#6F7192]">{row.paymentMethod ?? '—'}</span> },
            { key: 'createdAt', label: 'Created', sortable: true, exportValue: (row: PaymentData) => new Date(row.createdAt).toISOString(), render: (row: PaymentData) => <span className="text-[#6F7192]">{new Date(row.createdAt).toLocaleString('en-IN')}</span> },
          ]}
        />
        {totalPages > 1 && (
          <div className="mt-4 flex items-center justify-center gap-3">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="rounded-lg border border-[#6d28d9]/10 px-3 py-1.5 text-sm font-semibold text-[#0F1B3D] disabled:opacity-40">Previous</button>
            <span className="text-sm text-[#6F7192]">Page {page} of {totalPages}</span>
            <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}
              className="rounded-lg border border-[#6d28d9]/10 px-3 py-1.5 text-sm font-semibold text-[#0F1B3D] disabled:opacity-40">Next</button>
          </div>
        )}
      </motion.div>
    </div>
  )
}
