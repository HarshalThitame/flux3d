'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CreditCard } from 'lucide-react'
import DataTable from '@/components/admin/DataTable'
import type { PaymentData } from '@/lib/admin/types'
import SkeletonBlock from '@/components/admin/SkeletonBlock'

export default function PaymentsPage() {
  const [payments, setPayments] = useState<PaymentData[] | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const controller = new AbortController()
    
    async function load() {
      try {
        const response = await fetch('/api/admin/payments', { signal: controller.signal })
        if (response.ok) {
          const json = await response.json()
          setPayments(json.payments || [])
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
    { label: 'Total Collected', value: '₹0', tone: 'text-emerald-400' },
    { label: 'Pending', value: '₹0', tone: 'text-yellow-400' },
    { label: 'Refunded', value: '₹0', tone: 'text-red-400' },
    { label: 'Gateway Fees', value: '₹0', tone: 'text-[#7a82a0]' },
  ]

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#FF5C1A]/20 bg-[#FF5C1A]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#FF9A72]">
          <CreditCard className="h-3 w-3" />
          Payments & Invoices
        </div>
        <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-white">Payments & Invoices</h1>
        <p className="mt-2 max-w-xl text-sm text-[#7a82a0]">
          Track all transactions and invoices
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.05 }}
        className="grid grid-cols-2 gap-4 lg:grid-cols-4"
      >
        {summaryCards.map((card) => (
          <div key={card.label} className="rounded-2xl border border-white/[0.06] bg-[#0a0f1e] p-5">
            <p className="text-xs text-[#7a82a0]">{card.label}</p>
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
          title="Payments"
          description="Track and manage all transactions"
          data={payments as PaymentData[]}
          searchPlaceholder="Search by transaction ID, order ID, customer..."
          searchKeys={['transactionId', 'orderId', 'customer']}
          columns={[
            { key: 'transactionId', label: 'Transaction ID', sortable: true, render: (row: PaymentData) => <span className="font-medium text-white">{row.transactionId}</span> },
            { key: 'orderId', label: 'Order ID', sortable: true, render: (row: PaymentData) => <span className="text-[#c6cee5]">{row.orderId}</span> },
            { key: 'customer', label: 'Customer', sortable: true, render: (row: PaymentData) => <span className="text-[#c6cee5]">{row.customer}</span> },
            { key: 'amount', label: 'Amount', sortable: true, render: (row: PaymentData) => <span className="font-medium text-white">₹{row.amount.toLocaleString('en-IN')}</span> },
            { key: 'method', label: 'Method', sortable: true, render: (row: PaymentData) => <span className="text-[#c6cee5]">{row.method}</span> },
            { key: 'status', label: 'Status', sortable: true, render: (row: PaymentData) => (
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                row.status === 'Paid' ? 'bg-emerald-400/20 text-emerald-400' :
                row.status === 'Pending' ? 'bg-yellow-400/20 text-yellow-400' :
                row.status === 'Refunded' ? 'bg-red-400/20 text-red-400' :
                'bg-gray-400/20 text-gray-400'
              }`}>
                {row.status}
              </span>
            )},
            { key: 'gateway', label: 'Gateway', sortable: true, render: (row: PaymentData) => <span className="text-[#c6cee5]">{row.gateway}</span> },
            { key: 'date', label: 'Date', sortable: true, render: (row: PaymentData) => <span className="text-[#8b95b5]">{row.date}</span> },
            { key: 'invoice', label: 'Invoice', render: () => (
              <button className="text-[#FF5C1A] hover:text-[#FF9A72] text-sm">Generate</button>
            )},
            { key: 'action', label: 'Action', render: () => (
              <button className="text-[#FF5C1A] hover:text-[#FF9A72] text-sm">View</button>
            )},
          ]}
        />
      </motion.div>
    </div>
  )
}
