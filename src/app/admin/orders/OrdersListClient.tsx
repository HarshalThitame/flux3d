'use client'

import { useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Boxes,
  Check,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  IndianRupee,
  LoaderCircle,
  PackageOpen,
  Plus,
  Printer,
  Search,
  X,
} from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import type { AdminOrder } from '@/lib/admin/types'
import {
  getAllowedOrderStatusTransitions,
  getOrderStatusTransitionError,
  isSequentialOrderStatusTransition,
  type OrderStatus,
} from '@/lib/orders'
import { logSearch } from '@/lib/tracking/searchLogger'
import {
  ADMIN_ORDER_STATUSES,
  STATUS_LABELS,
  colorToCss,
  discountPercent,
  formatDate,
  formatMoney,
  formatNumber,
  formatTime,
  postProcessingLabel,
  safeText,
  statusPillClass,
} from './order-ui'

const PAGE_SIZE = 25

type Props = {
  initialOrders: AdminOrder[]
  initialTotal: number
  initialQuery?: string
}

function csvCell(value: string | number | null | undefined) {
  return `"${String(value ?? '').replace(/"/g, '""')}"`
}

export default function OrdersListClient({ initialOrders, initialTotal, initialQuery = '' }: Props) {
  const router = useRouter()
  const [allOrders, setAllOrders] = useState(initialOrders)
  const [search, setSearch] = useState(initialQuery)
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>('all')
  const [paymentStatusFilter, setPaymentStatusFilter] = useState('all')
  const [materialFilter, setMaterialFilter] = useState('all')
  const [postProcessingFilter, setPostProcessingFilter] = useState('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [page, setPage] = useState(1)
  const [totalCount] = useState(initialTotal)
  const [fetchingPage, setFetchingPage] = useState(false)
  const [updatingGroupId, setUpdatingGroupId] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<string>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [toast, setToast] = useState<AdminToastState>(null)
  const loadedRef = useRef(false)
  const toastTimer = useRef<number | null>(null)

  function showToast(nextToast: NonNullable<AdminToastState>) {
    setToast(nextToast)
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current)
    }
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }

  const stats = useMemo(() => {
    return {
      totalOrders: totalCount,
      revenue: allOrders.reduce((sum, order) => sum + order.grandTotal, 0),
      pending: allOrders.filter((order) => order.status === 'pending').length,
      printing: allOrders.filter((order) => order.status === 'printing').length,
    }
  }, [allOrders])

  const materialOptions = useMemo(() => {
    return Array.from(new Set(allOrders.flatMap((order) => order.items.map((item) => item.material)).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right))
  }, [allOrders])

  const postProcessingOptions = useMemo(() => {
    return Array.from(new Set(allOrders.flatMap((order) => order.items.map((item) => item.postProcessingLevel ?? 'none'))))
      .sort((left, right) => postProcessingLabel(left).localeCompare(postProcessingLabel(right)))
  }, [allOrders])

  function toggleSort(column: string) {
    if (sortColumn === column) {
      setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  function sortOrders(list: AdminOrder[]) {
    const sorted = [...list]
    sorted.sort((a, b) => {
      let comparison = 0
      switch (sortColumn) {
        case 'orderNumber':
          comparison = a.orderNumber.localeCompare(b.orderNumber)
          break
        case 'fullName':
          comparison = a.fullName.localeCompare(b.fullName)
          break
        case 'grandTotal':
          comparison = a.grandTotal - b.grandTotal
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
        default:
          comparison = 0
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
    return sorted
  }

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLowerCase()
    const fromTime = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null
    const toTime = dateTo ? new Date(`${dateTo}T23:59:59`).getTime() : null

    return sortOrders(allOrders.filter((order) => {
      const createdAt = new Date(order.createdAt).getTime()
      const searchPool = [
        order.orderNumber,
        order.groupId,
        order.fullName,
        order.phone,
        order.material,
        ...order.items.flatMap((item) => [item.fileName, item.material, item.color]),
      ]
      const matchesSearch = query.length === 0 || searchPool.some((value) => value?.toLowerCase().includes(query))
      const matchesStatus = statusFilter === 'all' || order.status === statusFilter
      const matchesPayment = paymentStatusFilter === 'all' || (order.paymentStatus ?? 'pending') === paymentStatusFilter
      const matchesMaterial = materialFilter === 'all' || order.items.some((item) => item.material === materialFilter)
      const matchesPostProcessing =
        postProcessingFilter === 'all' ||
        order.items.some((item) => (item.postProcessingLevel ?? 'none') === postProcessingFilter)
      const matchesFrom = fromTime === null || createdAt >= fromTime
      const matchesTo = toTime === null || createdAt <= toTime

      return matchesSearch && matchesStatus && matchesPayment && matchesMaterial && matchesPostProcessing && matchesFrom && matchesTo
    }))
  }, [dateFrom, dateTo, materialFilter, allOrders, paymentStatusFilter, postProcessingFilter, search, sortColumn, sortDirection, statusFilter])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)
  const hasFilters = Boolean(search || dateFrom || dateTo || statusFilter !== 'all' || materialFilter !== 'all' || postProcessingFilter !== 'all')

  useEffect(() => {
    if (loadedRef.current || page === 1) {
      loadedRef.current = true
      return
    }
    setFetchingPage(true)
    fetch(`/api/admin/orders?page=${page}&limit=100`)
      .then((res) => res.json())
      .then((data) => {
        if (data.orders) {
          setAllOrders((current) => {
            const existingIds = new Set(current.map((o) => o.groupId))
            const newOrders = (data.orders as AdminOrder[]).filter((o) => !existingIds.has(o.groupId))
            return [...current, ...newOrders]
          })
        }
        setFetchingPage(false)
      })
      .catch(() => setFetchingPage(false))
  }, [page])

  useEffect(() => {
    if (!hasFilters) return

    const timeout = window.setTimeout(() => {
      void logSearch(null, search.trim() || null, {
        area: 'admin_orders',
        statusFilter,
        materialFilter,
        postProcessingFilter,
        dateFrom,
        dateTo,
      }, filteredOrders.length).catch(() => {})
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [dateFrom, dateTo, filteredOrders.length, hasFilters, materialFilter, postProcessingFilter, search, statusFilter])

  const someSelected = selectedIds.size > 0
  const allVisibleSelected = paginatedOrders.length > 0 && paginatedOrders.every((order) => selectedIds.has(order.groupId))
  const visibleIds = paginatedOrders.map((order) => order.groupId)

  function toggleSelect(groupId: string) {
    setSelectedIds((current) => {
      const next = new Set(current)
      if (next.has(groupId)) { next.delete(groupId) } else { next.add(groupId) }
      return next
    })
  }

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(visibleIds))
    }
  }

  async function applyBulkStatus(status: OrderStatus) {
    if (selectedIds.size === 0) return
    setBulkUpdating(true)
    let success = 0
    let failed = 0
    for (const groupId of selectedIds) {
      try {
        const response = await fetch('/api/admin/orders', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ groupId, status }),
        })
        if (response.ok) {
          const json = await response.json() as { order: AdminOrder }
          setAllOrders((current) => current.map((order) => order.groupId === groupId ? json.order : order))
          success++
        } else {
          failed++
        }
      } catch {
        failed++
      }
    }
    setSelectedIds(new Set())
    setBulkUpdating(false)
    if (failed === 0) {
      showToast({ type: 'success', message: `${success} order${success === 1 ? '' : 's'} marked ${STATUS_LABELS[status].toLowerCase()}.` })
    } else {
      showToast({ type: 'error', message: `${success} updated, ${failed} failed.` })
    }
  }

  function clearFilters() {
    setSearch('')
    setStatusFilter('all')
    setPaymentStatusFilter('all')
    setMaterialFilter('all')
    setPostProcessingFilter('all')
    setDateFrom('')
    setDateTo('')
    setPage(1)
  }

  function exportCsv() {
    const header = ['Order Number', 'Customer', 'Phone', 'Files', 'Materials', 'Status', 'Grand Total', 'Discount', 'Created At']
    const rows = filteredOrders.map((order) => [
      order.orderNumber,
      order.fullName,
      order.phone ?? '',
      order.items.map((item) => item.fileName).join('; '),
      order.items.map((item) => item.material).join('; '),
      STATUS_LABELS[order.status],
      order.grandTotal,
      order.discountAmount ?? 0,
      order.createdAt,
    ])
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `flux3d-orders-${new Date().toISOString().slice(0, 10)}.csv`
    link.click()
    URL.revokeObjectURL(url)
    showToast({ type: 'success', message: 'Orders exported as CSV.' })
  }

  async function updateOrderStatus(order: AdminOrder, status: OrderStatus) {
    if (status === order.status) return
    if (!isSequentialOrderStatusTransition(order.status, status)) {
      showToast({ type: 'error', message: getOrderStatusTransitionError(order.status, status) })
      return
    }

    const previousOrders = allOrders
    setUpdatingGroupId(order.groupId)
    setAllOrders((current) =>
      current.map((item) =>
        item.groupId === order.groupId
          ? {
              ...item,
              status,
              items: item.items.map((orderItem) => ({ ...orderItem, status })),
            }
          : item
      )
    )

    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: order.groupId, status }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Failed to update status.')
      }
      const json = (await response.json()) as { order: AdminOrder }
      setAllOrders((current) => current.map((item) => (item.groupId === order.groupId ? json.order : item)))
      showToast({ type: 'success', message: `${json.order.orderNumber} marked ${STATUS_LABELS[status].toLowerCase()}.` })
    } catch (error) {
      setAllOrders(previousOrders)
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update status.' })
    } finally {
      setUpdatingGroupId(null)
    }
  }

  return (
    <>
      <div className="w-full bg-gray-50 text-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                {stats.totalOrders.toLocaleString('en-IN')}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={exportCsv}
                className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
              >
                <Download className="h-4 w-4" />
                Export CSV
              </button>
              <Link
                href="/instant-quote"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                <Plus className="h-4 w-4" />
                New Order
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard icon={<Boxes className="h-4 w-4" />} label="Total Orders" value={stats.totalOrders.toLocaleString('en-IN')} />
            <StatCard icon={<IndianRupee className="h-4 w-4" />} label="Revenue" value={formatMoney(stats.revenue)} />
            <StatCard icon={<PackageOpen className="h-4 w-4" />} label="Pending" value={stats.pending.toLocaleString('en-IN')} />
            <StatCard icon={<Printer className="h-4 w-4" />} label="Printing" value={stats.printing.toLocaleString('en-IN')} />
          </div>

          <div className="mt-5 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="grid gap-3 xl:grid-cols-[minmax(260px,1.6fr)_150px_160px_150px_150px_190px_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Search by order# / name / phone"
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                />
              </label>
              <FilterSelect
                label="Status"
                value={statusFilter}
                onChange={(value) => {
                  setStatusFilter(value as 'all' | OrderStatus)
                  setPage(1)
                }}
              >
                <option value="all">Status</option>
                {ADMIN_ORDER_STATUSES.map((status) => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </FilterSelect>
              <FilterSelect
                label="Payment"
                value={paymentStatusFilter}
                onChange={(value) => {
                  setPaymentStatusFilter(value)
                  setPage(1)
                }}
              >
                <option value="all">Payment</option>
                <option value="paid">Paid</option>
                <option value="pending">Pending</option>
                <option value="refunded">Refunded</option>
                <option value="failed">Failed</option>
                <option value="cancelled">Cancelled</option>
              </FilterSelect>
              <FilterSelect
                label="Material"
                value={materialFilter}
                onChange={(value) => {
                  setMaterialFilter(value)
                  setPage(1)
                }}
              >
                <option value="all">Material</option>
                {materialOptions.map((material) => (
                  <option key={material} value={material}>
                    {material}
                  </option>
                ))}
              </FilterSelect>
              <DateInput
                label="Date From"
                value={dateFrom}
                onChange={(value) => {
                  setDateFrom(value)
                  setPage(1)
                }}
              />
              <DateInput
                label="Date To"
                value={dateTo}
                onChange={(value) => {
                  setDateTo(value)
                  setPage(1)
                }}
              />
              <FilterSelect
                label="Post-processing"
                value={postProcessingFilter}
                onChange={(value) => {
                  setPostProcessingFilter(value)
                  setPage(1)
                }}
              >
                <option value="all">Post-processing</option>
                {postProcessingOptions.map((level) => (
                  <option key={level} value={level}>
                    {postProcessingLabel(level)}
                  </option>
                ))}
              </FilterSelect>
              <button
                type="button"
                onClick={clearFilters}
                disabled={!hasFilters}
                className="inline-flex h-10 items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
              >
                <X className="h-4 w-4" />
                Clear Filters
              </button>
            </div>
          </div>

          {paginatedOrders.length === 0 ? (
            <div className="mt-5 rounded-xl border border-gray-200 bg-white px-4 py-16 text-center shadow-sm">
              <PackageOpen className="mx-auto h-10 w-10 text-gray-300" />
              <div className="mt-3 text-sm font-semibold text-gray-900">No orders found</div>
              <p className="mt-1 text-sm text-gray-600">Adjust filters or clear search to see more orders.</p>
            </div>
          ) : (
            <>
              {someSelected && (
                <div className="mt-4 flex flex-wrap items-center gap-3 rounded-xl border border-violet-200 bg-violet-50 p-3">
                  <span className="text-sm font-medium text-violet-700">{selectedIds.size} selected</span>
                  <div className="flex flex-wrap gap-2">
                    {['confirmed', 'printing', 'shipped', 'delivered'].map((status) => {
                      const s = status as OrderStatus
                      return (
                        <button
                          key={s}
                          type="button"
                          disabled={bulkUpdating}
                          onClick={() => applyBulkStatus(s)}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-violet-200 bg-white px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-100 disabled:opacity-50"
                        >
                          {bulkUpdating ? <LoaderCircle className="h-3 w-3 animate-spin" /> : null}
                          Mark {STATUS_LABELS[s]}
                        </button>
                      )
                    })}
                    <button
                      type="button"
                      onClick={() => setSelectedIds(new Set())}
                      className="inline-flex h-8 items-center rounded-lg px-3 text-xs font-medium text-gray-500 transition hover:text-gray-700"
                    >
                      Clear
                    </button>
                  </div>
                </div>
              )}
              <div className="mt-5 space-y-3 md:hidden">
                {paginatedOrders.map((order) => (
                  <MobileOrderCard
                    key={order.groupId}
                    order={order}
                    selected={selectedIds.has(order.groupId)}
                    onToggleSelect={() => toggleSelect(order.groupId)}
                    updating={updatingGroupId === order.groupId}
                    onOpen={() => router.push(`/admin/orders/${order.groupId}`)}
                    onStatusChange={(status) => updateOrderStatus(order, status)}
                  />
                ))}
              </div>

              <div className="mt-5 hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
                <div className="max-h-[68vh] overflow-auto">
                  <table className="w-full min-w-[1120px] border-separate border-spacing-0 text-left text-sm">
                    <thead className="sticky top-0 z-20 bg-gray-50 text-xs uppercase tracking-wider text-gray-500">
                      <tr>
                        <th className="w-10 border-b border-gray-200 px-3 py-3">
                          <button
                            type="button"
                            onClick={toggleSelectAll}
                            className="grid h-5 w-5 place-items-center rounded border border-gray-300 bg-white transition hover:border-violet-400"
                          >
                            {allVisibleSelected && <Check className="h-3 w-3 text-violet-600" />}
                          </button>
                        </th>
                        <Th sortable sortColumn={sortColumn} sortDirection={sortDirection} column="orderNumber" onSort={toggleSort}>Order#</Th>
                        <Th sortable sortColumn={sortColumn} sortDirection={sortDirection} column="fullName" onSort={toggleSort}>Customer</Th>
                        <Th>Items</Th>
                        <Th className="hidden lg:table-cell">Config</Th>
                        <Th sortable sortColumn={sortColumn} sortDirection={sortDirection} column="grandTotal" onSort={toggleSort}>Amount</Th>
                        <Th className="hidden xl:table-cell">Post-process</Th>
                        <Th sortable sortColumn={sortColumn} sortDirection={sortDirection} column="status" onSort={toggleSort}>Status</Th>
                        <Th className="hidden xl:table-cell">Print Time</Th>
                        <Th sortable sortColumn={sortColumn} sortDirection={sortDirection} column="createdAt" onSort={toggleSort}>Date</Th>
                        <Th>Actions</Th>
                      </tr>
                    </thead>
                    <tbody>
                      {paginatedOrders.map((order, index) => (
                        <OrderRow
                          key={order.groupId}
                          order={order}
                          rowIndex={index}
                          selected={selectedIds.has(order.groupId)}
                          onToggleSelect={() => toggleSelect(order.groupId)}
                          updating={updatingGroupId === order.groupId}
                          onOpen={() => router.push(`/admin/orders/${order.groupId}`)}
                          onStatusChange={(status) => updateOrderStatus(order, status)}
                        />
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}

          <Pagination
            filteredCount={filteredOrders.length}
            currentPage={currentPage}
            totalPages={totalPages}
            serverTotal={totalCount}
            fetching={fetchingPage}
            setPage={setPage}
          />
        </div>
      </div>

      <AdminToast toast={toast} />
    </>
  )
}

function StatCard({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</div>
        <div className="rounded-lg border border-violet-100 bg-violet-50 p-2 text-violet-600">{icon}</div>
      </div>
      <div className="mt-3 text-2xl font-bold text-gray-900">{value}</div>
    </div>
  )
}

function FilterSelect({
  label,
  value,
  onChange,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  children: ReactNode
}) {
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
    >
      {children}
    </select>
  )
}

function DateInput({ label, value, onChange }: { label: string; value: string; onChange: (value: string) => void }) {
  return (
    <input
      aria-label={label}
      type="date"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-10 w-full rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
    />
  )
}

function Th({ children, className = '', sortable, sortColumn, sortDirection, column, onSort }: {
  children: ReactNode
  className?: string
  sortable?: boolean
  sortColumn?: string
  sortDirection?: 'asc' | 'desc'
  column?: string
  onSort?: (column: string) => void
}) {
  const isActive = sortable && column === sortColumn
  return (
    <th
      className={`border-b border-gray-200 px-4 py-3 font-semibold ${sortable ? 'cursor-pointer select-none hover:text-gray-700' : ''} ${className}`}
      onClick={sortable && onSort && column ? () => onSort(column) : undefined}
    >
      <span className="inline-flex items-center gap-1.5">
        {children}
        {sortable && column && (
          isActive
            ? (sortDirection === 'asc' ? <ArrowUp className="h-3 w-3" /> : <ArrowDown className="h-3 w-3" />)
            : <ArrowUpDown className="h-3 w-3 opacity-40" />
        )}
      </span>
    </th>
  )
}

function OrderRow({
  order,
  rowIndex,
  selected,
  onToggleSelect,
  updating,
  onOpen,
  onStatusChange,
}: {
  order: AdminOrder
  rowIndex: number
  selected?: boolean
  onToggleSelect?: () => void
  updating: boolean
  onOpen: () => void
  onStatusChange: (status: OrderStatus) => void
}) {
  const firstItem = order.items[0]
  const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const printTime = order.items.reduce((sum, item) => sum + item.estimatedTime, 0)
  const totalDiscount = order.discountAmount ?? order.cartDiscountAmount + order.couponDiscountAmount + order.offerDiscountAmount
  const totalDiscountPercent = discountPercent(order.totalPriceBeforeDiscount, totalDiscount)
  const rowTone = rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
  const statusOptions = getAllowedOrderStatusTransitions(order.status)

  return (
    <tr
      onClick={onOpen}
      className={`cursor-pointer border-l-2 transition hover:bg-gray-50 ${
        order.status === 'pending' ? 'border-l-yellow-400' : 'border-l-transparent'
      } ${rowTone}`}
    >
      <td className="w-10 border-b border-gray-100 px-3 py-4 align-top" onClick={(event) => event.stopPropagation()}>
        <button
          type="button"
          onClick={onToggleSelect}
          className="grid h-5 w-5 place-items-center rounded border border-gray-300 bg-white transition hover:border-violet-400"
        >
          {selected && <Check className="h-3 w-3 text-violet-600" />}
        </button>
      </td>
      <td className="border-b border-gray-100 px-4 py-4 align-top">
        <div className="font-semibold text-violet-600">{order.orderNumber}</div>
        {order.itemCount > 1 && <div className="mt-1 text-xs text-gray-500">{order.itemCount} items</div>}
      </td>
      <td className="border-b border-gray-100 px-4 py-4 align-top">
        <div className="font-medium text-gray-900">{safeText(order.fullName)}</div>
        <div className="mt-1 text-xs text-gray-500">{safeText(order.phone)}</div>
      </td>
      <td className="border-b border-gray-100 px-4 py-4 align-top">
        <div className="max-w-[220px] truncate font-medium text-gray-900" title={firstItem?.fileName}>{safeText(firstItem?.fileName)}</div>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-600">
          <span>{safeText(firstItem?.material ?? order.material)}</span>
          <span
            className="h-3 w-3 shrink-0 rounded-full border border-gray-300"
            style={{ backgroundColor: colorToCss(firstItem?.color ?? order.color) }}
            title={firstItem?.color ?? order.color}
          />
          <span className="max-w-[80px] truncate">{safeText(firstItem?.color ?? order.color)}</span>
        </div>
      </td>
      <td className="hidden border-b border-gray-100 px-4 py-4 align-top text-gray-600 lg:table-cell">
        <div>{formatNumber(firstItem?.infill, 0)}% · {formatNumber(firstItem?.layerHeight)} mm</div>
        <div className="mt-1 text-xs text-gray-500">Qty {quantity.toLocaleString('en-IN')}</div>
      </td>
      <td className="border-b border-gray-100 px-4 py-4 align-top">
        <div className="font-bold text-gray-900">{formatMoney(order.grandTotal)}</div>
        {totalDiscount > 0 && (
          <span className="mt-1 inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
            -{formatNumber(totalDiscountPercent, 1)}%
          </span>
        )}
      </td>
      <td className="hidden border-b border-gray-100 px-4 py-4 align-top xl:table-cell">
        <span className="inline-flex rounded-full bg-gray-100 px-2.5 py-1 text-xs font-medium text-gray-700">
          {postProcessingLabel(firstItem?.postProcessingLevel)}
        </span>
      </td>
      <td className="border-b border-gray-100 px-4 py-4 align-top">
        <span className={`inline-flex rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPillClass(order.status)}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </td>
      <td className="hidden border-b border-gray-100 px-4 py-4 align-top text-gray-600 xl:table-cell">
        {formatNumber(printTime, 1)} hrs
      </td>
      <td className="border-b border-gray-100 px-4 py-4 align-top">
        <div className="text-gray-900">{formatDate(order.createdAt)}</div>
        <div className="mt-1 text-xs text-gray-500">{formatTime(order.createdAt)}</div>
      </td>
      <td className="border-b border-gray-100 px-4 py-4 align-top">
        <div className="flex items-center gap-2" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 transition hover:bg-gray-50 hover:text-violet-700"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
          <select
            aria-label={`Update ${order.orderNumber} status`}
            value={order.status}
            disabled={updating}
            onChange={(event) => onStatusChange(event.target.value as OrderStatus)}
            className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-700 outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100 disabled:opacity-50"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </td>
    </tr>
  )
}

function MobileOrderCard({
  order,
  selected,
  onToggleSelect,
  updating,
  onOpen,
  onStatusChange,
}: {
  order: AdminOrder
  selected?: boolean
  onToggleSelect?: () => void
  updating: boolean
  onOpen: () => void
  onStatusChange: (status: OrderStatus) => void
}) {
  const firstItem = order.items[0]
  const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const printTime = order.items.reduce((sum, item) => sum + item.estimatedTime, 0)
  const totalDiscount = order.discountAmount ?? order.cartDiscountAmount + order.couponDiscountAmount + order.offerDiscountAmount
  const totalDiscountPercent = discountPercent(order.totalPriceBeforeDiscount, totalDiscount)
  const statusOptions = getAllowedOrderStatusTransitions(order.status)

  return (
    <article
      className={`w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:bg-gray-50 ${
        order.status === 'pending' ? 'border-l-4 border-l-yellow-400' : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <button
            type="button"
            onClick={(event) => { event.stopPropagation(); onToggleSelect?.() }}
            className="grid h-5 w-5 shrink-0 place-items-center rounded border border-gray-300 bg-white transition hover:border-violet-400"
          >
            {selected && <Check className="h-3 w-3 text-violet-600" />}
          </button>
          <div className="min-w-0 cursor-pointer" onClick={onOpen}>
            <div className="truncate font-semibold text-violet-600">{order.orderNumber}</div>
            <div className="mt-1 text-sm font-medium text-gray-900">{safeText(order.fullName)}</div>
            <div className="mt-0.5 text-xs text-gray-500">{safeText(order.phone)}</div>
          </div>
        </div>
        <span className={`shrink-0 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPillClass(order.status)}`}>
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="mt-4 rounded-lg bg-gray-50 p-3">
        <div className="truncate text-sm font-medium text-gray-900" title={firstItem?.fileName}>{safeText(firstItem?.fileName)}</div>
        <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-gray-600">
          <span className="truncate">{safeText(firstItem?.material ?? order.material)}</span>
          <span className="h-3 w-3 shrink-0 rounded-full border border-gray-300" style={{ backgroundColor: colorToCss(firstItem?.color ?? order.color) }} />
          <span className="truncate">{safeText(firstItem?.color ?? order.color)}</span>
        </div>
        <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-gray-600">
          <span>{formatNumber(firstItem?.infill, 0)}% · {formatNumber(firstItem?.layerHeight)} mm</span>
          <span>Qty {quantity.toLocaleString('en-IN')}</span>
          <span>{postProcessingLabel(firstItem?.postProcessingLevel)}</span>
          <span>{formatNumber(printTime, 1)} hrs</span>
        </div>
      </div>

      <div className="mt-4 flex items-end justify-between gap-3">
        <div>
          <div className="text-xs text-gray-500">{formatDate(order.createdAt)} · {formatTime(order.createdAt)}</div>
          <div className="mt-1 text-lg font-bold text-gray-900">{formatMoney(order.grandTotal)}</div>
          {totalDiscount > 0 && (
            <span className="mt-1 inline-flex rounded-full bg-orange-100 px-2 py-0.5 text-xs font-semibold text-orange-700">
              -{formatNumber(totalDiscountPercent, 1)}%
            </span>
          )}
        </div>
        <div className="flex flex-col gap-2" onClick={(event) => event.stopPropagation()}>
          <button
            type="button"
            onClick={onOpen}
            className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700"
          >
            <Eye className="h-3.5 w-3.5" />
            View
          </button>
          <select
            aria-label={`Update ${order.orderNumber} status`}
            value={order.status}
            disabled={updating}
            onChange={(event) => onStatusChange(event.target.value as OrderStatus)}
            className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-xs text-gray-700 outline-none"
          >
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {STATUS_LABELS[status]}
              </option>
            ))}
          </select>
        </div>
      </div>
    </article>
  )
}

function Pagination({
  filteredCount,
  currentPage,
  totalPages,
  serverTotal,
  fetching,
  setPage,
}: {
  filteredCount: number
  currentPage: number
  totalPages: number
  serverTotal?: number
  fetching?: boolean
  setPage: Dispatch<SetStateAction<number>>
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="text-sm text-gray-600">
        Showing {filteredCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
        {' '}–{' '}
        {Math.min(currentPage * PAGE_SIZE, filteredCount)} of {filteredCount.toLocaleString('en-IN')}
        {serverTotal != null && serverTotal > filteredCount && (
          <span className="text-gray-400"> (filtered from {serverTotal.toLocaleString('en-IN')} total)</span>
        )}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => setPage((current) => Math.max(1, current - 1))}
          disabled={currentPage === 1 || fetching}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <ChevronLeft className="h-4 w-4" />
          Prev
        </button>
        <span className="text-sm font-medium text-gray-900">
          {fetching ? <LoaderCircle className="inline h-4 w-4 animate-spin" /> : `Page ${currentPage} / ${totalPages}`}
        </span>
        <button
          type="button"
          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
          disabled={currentPage === totalPages || fetching}
          className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
