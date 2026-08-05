'use client'

import type { StockStatus } from '@/lib/shop/stock'

const styles: Record<StockStatus, string> = {
  in_stock: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  low_stock: 'border-amber-200 bg-amber-50 text-amber-700',
  out_of_stock: 'border-rose-200 bg-rose-50 text-rose-700',
  unavailable: 'border-gray-200 bg-gray-100 text-gray-600',
  no_skus: 'border-gray-200 bg-gray-100 text-gray-500',
}

const labels: Record<StockStatus, string> = {
  in_stock: 'In stock',
  low_stock: 'Low stock',
  out_of_stock: 'Out of stock',
  unavailable: 'Unavailable',
  no_skus: 'No SKUs',
}

export default function StockStatusBadge({ status }: { status: StockStatus }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${styles[status]}`}
    >
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {labels[status]}
    </span>
  )
}
