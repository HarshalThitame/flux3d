'use client'

import { useCallback, useEffect, useMemo, useRef, useState, type Dispatch, type ReactNode, type SetStateAction } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  Ban,
  Boxes,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Download,
  Eye,
  IndianRupee,
  LoaderCircle,
  PackageOpen,
  PencilLine,
  Plus,
  Printer,
  Search,
  Truck,
  X,
} from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import type { AdminOrder } from '@/lib/admin/types'
import type { AdminOrdersFilter, AdminOrdersStats } from '@/lib/admin/queries'
import {
  getAllowedOrderStatusTransitions,
  getOrderStatusTransitionError,
  isSequentialOrderStatusTransition,
  type OrderStatus,
} from '@/lib/orders'
import { logSearch } from '@/lib/tracking/searchLogger'
import { useOrdersRealtime } from './useOrdersRealtime'
import {
  ADMIN_ORDER_STATUSES,
  POST_PROCESSING_LEVELS,
  STATUS_LABELS,
  ageRowLeftBorderClass,
  ageSlaClass,
  ageSlaLevel,
  colorToCss,
  discountPercent,
  formatAge,
  formatDate,
  formatMoney,
  formatNumber,
  formatTime,
  postProcessingLabel,
  safeText,
  statusAgeMs,
  statusPillClass,
} from './order-ui'

const PAGE_SIZE_OPTIONS = [25, 50, 100] as const
const DEFAULT_PAGE_SIZE = 25
const SERVER_PAGE_SIZE = 100

type Props = {
  initialOrders: AdminOrder[]
  initialTotal: number
  initialQuery?: string
  initialFilter?: AdminOrdersFilter
  serverStats: AdminOrdersStats
}

export default function OrdersListClient({ initialOrders, initialTotal, initialQuery = '', initialFilter = {}, serverStats }: Props) {
  const router = useRouter()
  const [allOrders, setAllOrders] = useState(initialOrders)
  const [search, setSearch] = useState(initialQuery)
  const [statusFilter, setStatusFilter] = useState<'all' | OrderStatus>(
    initialFilter.status ? (initialFilter.status as OrderStatus) : 'all'
  )
  const [paymentStatusFilter, setPaymentStatusFilter] = useState(initialFilter.paymentStatus ?? 'all')
  const [materialFilter, setMaterialFilter] = useState(initialFilter.material ?? 'all')
  const [postProcessingFilter, setPostProcessingFilter] = useState(initialFilter.postProcessing ?? 'all')
  const [dateFrom, setDateFrom] = useState(initialFilter.dateFrom ?? '')
  const [dateTo, setDateTo] = useState(initialFilter.dateTo ?? '')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [totalCount, setTotalCount] = useState(initialTotal)
  const [fetchingPage, setFetchingPage] = useState(false)
  const [fetchingStats, setFetchingStats] = useState(false)
  const [stats, setStats] = useState<AdminOrdersStats>(serverStats)
  const [updatingGroupId, setUpdatingGroupId] = useState<string | null>(null)
  const [sortColumn, setSortColumn] = useState<string>('createdAt')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkUpdating, setBulkUpdating] = useState(false)
  const [toast, setToast] = useState<AdminToastState>(null)
  const [exportMenuOpen, setExportMenuOpen] = useState(false)
  const [exportMode, setExportMode] = useState<'filtered' | 'selected'>('filtered')
  const [exportingFormat, setExportingFormat] = useState<'csv' | 'xlsx' | 'pdf' | null>(null)
  const [nowTick, setNowTick] = useState(() => Date.now())
  const [editingNotesId, setEditingNotesId] = useState<string | null>(null)
  const [notesDraft, setNotesDraft] = useState('')
  const loadedServerPage = useRef(1)
  const toastTimer = useRef<number | null>(null)

  useEffect(() => {
    const interval = window.setInterval(() => setNowTick(Date.now()), 60000)
    return () => window.clearInterval(interval)
  }, [])

function showToast(nextToast: NonNullable<AdminToastState>) {
    setToast(nextToast)
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current)
    }
    toastTimer.current = window.setTimeout(() => setToast(null), 2600)
  }

  

  const materialOptions = useMemo(() => {
    return Array.from(new Set(allOrders.flatMap((order) => order.items.map((item) => item.material)).filter(Boolean)))
      .sort((left, right) => left.localeCompare(right))
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
    return sortOrders(allOrders)
  }, [allOrders, sortColumn, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize))
  const currentPage = Math.min(page, totalPages)
  const paginatedOrders = filteredOrders.slice((currentPage - 1) * pageSize, currentPage * pageSize)
  const hasFilters = Boolean(
    search || dateFrom || dateTo || statusFilter !== 'all' || paymentStatusFilter !== 'all' || materialFilter !== 'all' || postProcessingFilter !== 'all'
  )

  const currentFilter: AdminOrdersFilter = {
    query: search.trim() || undefined,
    status: statusFilter !== 'all' ? statusFilter : undefined,
    paymentStatus: paymentStatusFilter !== 'all' ? paymentStatusFilter : undefined,
    material: materialFilter !== 'all' ? materialFilter : undefined,
    postProcessing: postProcessingFilter !== 'all' ? postProcessingFilter : undefined,
    dateFrom: dateFrom || undefined,
    dateTo: dateTo || undefined,
  }

  const buildServerParams = useCallback((targetPage: number) => {
    const params = new URLSearchParams()
    params.set('page', String(targetPage))
    params.set('limit', String(SERVER_PAGE_SIZE))
    if (currentFilter.query) params.set('query', currentFilter.query)
    if (currentFilter.status) params.set('status', currentFilter.status)
    if (currentFilter.paymentStatus) params.set('paymentStatus', currentFilter.paymentStatus)
    if (currentFilter.material) params.set('material', currentFilter.material)
    if (currentFilter.postProcessing) params.set('postProcessing', currentFilter.postProcessing)
    if (currentFilter.dateFrom) params.set('dateFrom', currentFilter.dateFrom)
    if (currentFilter.dateTo) params.set('dateTo', currentFilter.dateTo)
    return params
  }, [currentFilter.query, currentFilter.status, currentFilter.paymentStatus, currentFilter.material, currentFilter.postProcessing, currentFilter.dateFrom, currentFilter.dateTo])

  const currentFilterSignature = `${currentFilter.query ?? ''}|${currentFilter.status ?? ''}|${currentFilter.paymentStatus ?? ''}|${currentFilter.material ?? ''}|${currentFilter.postProcessing ?? ''}|${currentFilter.dateFrom ?? ''}|${currentFilter.dateTo ?? ''}`

  async function refreshStats() {
    const params = buildServerParams(1)
    params.set('stats', 'true')
    try {
      const res = await fetch(`/api/admin/orders?${params.toString()}`)
      if (!res.ok) throw new Error(`Stats fetch failed (${res.status})`)
      const data = (await res.json()) as AdminOrdersStats
      setStats(data)
    } catch (err) {
      console.error('[OrdersList] Failed to refresh stats:', err)
    }
  }

  async function refreshOrders({ keepSelection = false }: { keepSelection?: boolean } = {}) {
    const params = buildServerParams(1)
    params.set('limit', String(SERVER_PAGE_SIZE))
    try {
      const res = await fetch(`/api/admin/orders?${params.toString()}`)
      if (!res.ok) return
      const data = (await res.json()) as { orders: AdminOrder[]; total: number }
      setAllOrders((current) => {
        if (!keepSelection) return data.orders
        const fresh = new Map(current.map((order) => [order.groupId, order]))
        for (const order of data.orders) fresh.set(order.groupId, order)
        return Array.from(fresh.values())
      })
      setTotalCount(data.total ?? 0)
    } catch (err) {
      console.error('[OrdersList] Failed to refresh orders:', err)
    }
  }

  const realtimeRefreshTimer = useRef<number | null>(null)

  function handleRealtimeOrderChange() {
    if (realtimeRefreshTimer.current !== null) {
      window.clearTimeout(realtimeRefreshTimer.current)
    }
    realtimeRefreshTimer.current = window.setTimeout(() => {
      void refreshOrders({ keepSelection: true })
      void refreshStats()
    }, 1000)
  }

  const { status: realtimeStatus } = useOrdersRealtime(handleRealtimeOrderChange)

  useEffect(() => {
    return () => {
      if (realtimeRefreshTimer.current !== null) {
        window.clearTimeout(realtimeRefreshTimer.current)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const params = buildServerParams(1)
    params.set('stats', 'true')
    Promise.resolve()
      .then(() => {
        setFetchingStats(true)
        return fetch(`/api/admin/orders?${params.toString()}`, { signal: controller.signal })
      })
      .then((res) => res.json())
      .then((data: AdminOrdersStats) => {
        if (!controller.signal.aborted) {
          setStats(data)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) {
          setFetchingStats(false)
        }
      })
    return () => controller.abort()
  }, [buildServerParams, currentFilterSignature])

  useEffect(() => {
    const controller = new AbortController()
    const params = buildServerParams(1)
    params.set('limit', String(SERVER_PAGE_SIZE))
    Promise.resolve()
      .then(() => {
        setFetchingPage(true)
        setAllOrders([])
        setSelectedIds(new Set())
        loadedServerPage.current = 1
        return fetch(`/api/admin/orders?${params.toString()}`, { signal: controller.signal })
      })
      .then((res) => res.json())
      .then((data: { orders: AdminOrder[]; total: number }) => {
        if (!controller.signal.aborted && data.orders) {
          setAllOrders(data.orders)
          setTotalCount(data.total ?? 0)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!controller.signal.aborted) {
          setFetchingPage(false)
        }
      })
    return () => controller.abort()
  }, [buildServerParams, currentFilterSignature])

  useEffect(() => {
    const serverPagesPerClientPage = SERVER_PAGE_SIZE / pageSize
    const requiredServerPage = Math.ceil(page / serverPagesPerClientPage)

    if (requiredServerPage > loadedServerPage.current) {
      const controller = new AbortController()
      const params = buildServerParams(requiredServerPage)
      params.set('limit', String(SERVER_PAGE_SIZE))
      Promise.resolve()
        .then(() => {
          setFetchingPage(true)
          return fetch(`/api/admin/orders?${params.toString()}`, { signal: controller.signal })
        })
        .then((res) => res.json())
        .then((data: { orders: AdminOrder[]; total: number }) => {
          if (!controller.signal.aborted && data.orders) {
            const newOrders = data.orders
            setAllOrders((current) => [...current, ...newOrders.filter((o) => !current.some((e) => e.groupId === o.groupId))])
            setTotalCount(data.total ?? 0)
          }
        })
        .catch(() => {})
        .finally(() => {
          if (!controller.signal.aborted) {
            setFetchingPage(false)
            loadedServerPage.current = requiredServerPage
          }
        })
      return () => controller.abort()
    }
    return undefined
  }, [page, pageSize, buildServerParams])

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (search.trim()) {
      params.set('query', search.trim())
    } else {
      params.delete('query')
    }
    if (statusFilter !== 'all') {
      params.set('status', statusFilter)
    } else {
      params.delete('status')
    }
    if (paymentStatusFilter !== 'all') {
      params.set('paymentStatus', paymentStatusFilter)
    } else {
      params.delete('paymentStatus')
    }
    if (materialFilter !== 'all') {
      params.set('material', materialFilter)
    } else {
      params.delete('material')
    }
    if (postProcessingFilter !== 'all') {
      params.set('postProcessing', postProcessingFilter)
    } else {
      params.delete('postProcessing')
    }
    if (dateFrom) params.set('dateFrom', dateFrom)
    else params.delete('dateFrom')
    if (dateTo) params.set('dateTo', dateTo)
    else params.delete('dateTo')

    const newUrl = `${window.location.pathname}?${params.toString()}`
    window.history.replaceState(null, '', newUrl)
  }, [search, statusFilter, paymentStatusFilter, materialFilter, postProcessingFilter, dateFrom, dateTo])

  useEffect(() => {
    if (!hasFilters) return

    const timeout = window.setTimeout(() => {
      void logSearch(null, search.trim() || null, {
        area: 'admin_orders',
        statusFilter,
        paymentStatusFilter,
        materialFilter,
        postProcessingFilter,
        dateFrom,
        dateTo,
      }, filteredOrders.length).catch(() => {})
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [dateFrom, dateTo, filteredOrders.length, hasFilters, materialFilter, paymentStatusFilter, postProcessingFilter, search, statusFilter])

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
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batch: true,
          status,
          groupIds: Array.from(selectedIds),
        }),
      })
      if (response.ok) {
        const json = (await response.json()) as { result: { updates: Array<{ groupId: string; orderNumber: string; updated: boolean }>; updatedCount: number; failedCount: number } }
        const updatedIds = new Set(json.result.updates.filter((u) => u.updated).map((u) => u.groupId))
        setAllOrders((current) => current.map((order) =>
          updatedIds.has(order.groupId)
            ? { ...order, status, items: order.items.map((item) => ({ ...item, status })) }
            : order
        ))
        setSelectedIds(new Set())
        void refreshStats()
        if (json.result.failedCount === 0) {
          showToast({ type: 'success', message: `${json.result.updatedCount} order${json.result.updatedCount === 1 ? '' : 's'} marked ${STATUS_LABELS[status].toLowerCase()}.` })
        } else {
          showToast({ type: 'error', message: `${json.result.updatedCount} updated, ${json.result.failedCount} failed.` })
        }
      } else {
        showToast({ type: 'error', message: 'Bulk update failed.' })
      }
    } catch {
      showToast({ type: 'error', message: 'Bulk update failed.' })
    } finally {
      setBulkUpdating(false)
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
    loadedServerPage.current = 1
  }

  function changePageSize(nextSize: number) {
    setPageSize(nextSize)
    setPage(1)
    loadedServerPage.current = 1
  }

  async function exportToServer(format: 'csv' | 'xlsx' | 'pdf', mode: 'filtered' | 'selected') {
    const groupIds = mode === 'selected' ? Array.from(selectedIds) : undefined
    if (mode === 'selected' && groupIds && groupIds.length === 0) return
    setExportingFormat(format)
    try {
      const response = await fetch('/api/admin/orders/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format,
          groupIds,
          filter: mode === 'filtered' ? currentFilter : undefined,
        }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Export failed.')
      }
      const blob = await response.blob()
      const url = URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `flux3d-orders-${new Date().toISOString().slice(0, 10)}.${format}`
      link.click()
      URL.revokeObjectURL(url)
      showToast({ type: 'success', message: `Exported ${format.toUpperCase()} (${mode === 'selected' ? 'selected' : 'filtered'}).` })
    } catch (error) {
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Export failed.' })
    } finally {
      setExportingFormat(null)
    }
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
      void refreshStats()
      showToast({ type: 'success', message: `${json.order.orderNumber} marked ${STATUS_LABELS[status].toLowerCase()}.` })
    } catch (error) {
      setAllOrders(previousOrders)
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update status.' })
    } finally {
      setUpdatingGroupId(null)
    }
  }

  function startEditingNotes(order: AdminOrder) {
    setNotesDraft(order.notes ?? '')
    setEditingNotesId(order.groupId)
  }

  function cancelEditingNotes() {
    setEditingNotesId(null)
    setNotesDraft('')
  }

  async function saveNotes(order: AdminOrder) {
    const nextNotes = notesDraft.trim() || null
    setEditingNotesId(null)
    setNotesDraft('')
    try {
      const response = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupId: order.groupId, notes: nextNotes }),
      })
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Failed to update notes.')
      }
      const json = (await response.json()) as { order: AdminOrder }
      setAllOrders((current) => current.map((item) => (item.groupId === order.groupId ? json.order : item)))
      showToast({ type: 'success', message: 'Notes saved.' })
    } catch (error) {
      setAllOrders((current) => current.map((item) => (item.groupId === order.groupId ? { ...item, notes: order.notes ?? null } : item)))
      showToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to update notes.' })
    }
  }

  return (
    <>
      <div className="w-full bg-gray-50 text-gray-900">
        <div className="w-full px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Orders</h1>
              <span className="rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700">
                {stats.totalOrders.toLocaleString('en-IN')}
              </span>
              <span
                title={
                  realtimeStatus === 'live'
                    ? 'Connected — orders update in real time'
                    : realtimeStatus === 'polling'
                      ? 'Realtime unavailable — refreshing every 60s'
                      : 'Connecting to updates…'
                }
                className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium ${
                  realtimeStatus === 'live'
                    ? 'border-green-200 bg-green-50 text-green-700'
                    : realtimeStatus === 'polling'
                      ? 'border-amber-200 bg-amber-50 text-amber-700'
                      : 'border-gray-200 bg-gray-100 text-gray-500'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    realtimeStatus === 'live' ? 'animate-pulse bg-green-500' : realtimeStatus === 'polling' ? 'bg-amber-500' : 'bg-gray-400'
                  }`}
                />
                {realtimeStatus === 'live' ? 'Live' : realtimeStatus === 'polling' ? 'Polling' : 'Connecting…'}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setExportMenuOpen((current) => !current)}
                  className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 transition hover:bg-gray-50"
                >
                  <Download className="h-4 w-4" />
                  Export
                  {exportMode === 'selected' && (
                    <span className="rounded-full bg-violet-100 px-1.5 py-0.5 text-[10px] font-bold text-violet-700">
                      {selectedIds.size}
                    </span>
                  )}
                  <ChevronDown className="h-3.5 w-3.5 text-gray-400" />
                </button>
                {exportMenuOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setExportMenuOpen(false)}
                      aria-hidden
                    />
                    <div className="absolute right-0 z-20 mt-1 w-64 rounded-xl border border-gray-200 bg-white p-1.5 shadow-lg">
                      <div className="px-3 pb-1.5 pt-1.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Export source
                      </div>
                      <div className="mb-1.5 flex gap-1 rounded-lg bg-gray-100 p-1">
                        <button
                          type="button"
                          onClick={() => setExportMode('filtered')}
                          className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition ${
                            exportMode === 'filtered' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Filtered ({filteredOrders.length})
                        </button>
                        <button
                          type="button"
                          disabled={selectedIds.size === 0}
                          onClick={() => setExportMode('selected')}
                          className={`flex-1 rounded-md px-2 py-1 text-xs font-medium transition disabled:cursor-not-allowed disabled:opacity-40 ${
                            exportMode === 'selected' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
                          }`}
                        >
                          Selected ({selectedIds.size})
                        </button>
                      </div>
                      {(['xlsx', 'pdf', 'csv'] as const).map((format) => (
                        <button
                          key={format}
                          type="button"
                          disabled={exportingFormat !== null}
                          onClick={() => {
                            setExportMenuOpen(false)
                            void exportToServer(format, exportMode)
                          }}
                          className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <span className="capitalize">
                            {exportingFormat === format ? 'Exporting...' : `Export ${format.toUpperCase()}`}
                          </span>
                          {exportingFormat === format ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin text-violet-600" />
                          ) : null}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              <Link
                href="/instant-quote"
                className="inline-flex h-10 items-center gap-2 rounded-lg bg-violet-600 px-3 text-sm font-semibold text-white transition hover:bg-violet-700"
              >
                <Plus className="h-4 w-4" />
                New Order
              </Link>
            </div>
          </div>

          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 2xl:grid-cols-7">
            <StatCard icon={<Boxes className="h-4 w-4" />} label="Total Orders" value={stats.totalOrders.toLocaleString('en-IN')} loading={fetchingStats} />
            <StatCard icon={<IndianRupee className="h-4 w-4" />} label="Revenue" value={formatMoney(stats.revenue)} loading={fetchingStats} />
            <StatCard icon={<PackageOpen className="h-4 w-4" />} label="Pending" value={stats.pending.toLocaleString('en-IN')} />
            <StatCard icon={<Printer className="h-4 w-4" />} label="Printing" value={stats.printing.toLocaleString('en-IN')} />
            <StatCard icon={<Truck className="h-4 w-4" />} label="Shipped" value={stats.shipped.toLocaleString('en-IN')} />
            <StatCard icon={<Check className="h-4 w-4" />} label="Delivered" value={stats.delivered.toLocaleString('en-IN')} />
            <StatCard icon={<Ban className="h-4 w-4" />} label="Cancelled" value={stats.cancelled.toLocaleString('en-IN')} />
          </div>

          <div className="mt-5 rounded-xl border border-gray-200 bg-white p-3 shadow-sm">
            <div className="grid gap-3 xl:grid-cols-[minmax(220px,1.5fr)_140px_140px_150px_180px_150px_150px_auto]">
              <label className="relative block">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={search}
                  onChange={(event) => {
                    setSearch(event.target.value)
                    setPage(1)
                  }}
                  placeholder="Search by order #, customer name, phone"
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
              <FilterSelect
                label="Post-processing"
                value={postProcessingFilter}
                onChange={(value) => {
                  setPostProcessingFilter(value)
                  setPage(1)
                }}
              >
                <option value="all">Post-processing</option>
                {POST_PROCESSING_LEVELS.map((level) => (
                  <option key={level} value={level}>
                    {postProcessingLabel(level)}
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
                    now={nowTick}
                    editingNotes={editingNotesId === order.groupId}
                    notesDraft={notesDraft}
                    onNotesStart={() => startEditingNotes(order)}
                    onNotesCancel={cancelEditingNotes}
                    onNotesSave={() => saveNotes(order)}
                    onNotesChange={setNotesDraft}
                  />
                ))}
              </div>

              <div className="mt-5 hidden overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm md:block">
                <div data-lenis-prevent className="max-h-[75vh] overflow-auto overscroll-contain">
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
                        <Th className="hidden xl:table-cell">Notes</Th>
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
                          now={nowTick}
                          editingNotes={editingNotesId === order.groupId}
                          notesDraft={notesDraft}
                          onNotesStart={() => startEditingNotes(order)}
                          onNotesCancel={cancelEditingNotes}
                          onNotesSave={() => saveNotes(order)}
                          onNotesChange={setNotesDraft}
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
            pageSize={pageSize}
            onPageSizeChange={changePageSize}
            setPage={setPage}
          />
        </div>
      </div>

      <AdminToast toast={toast} />
    </>
  )
}

function StatCard({ icon, label, value, loading = false }: { icon: ReactNode; label: string; value: string; loading?: boolean }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">{label}</div>
        <div className="rounded-lg border border-violet-100 bg-violet-50 p-2 text-violet-600">{icon}</div>
      </div>
      <div className="mt-3 text-2xl font-bold text-gray-900">
        {loading ? <LoaderCircle className="h-5 w-5 animate-spin text-gray-300" /> : value}
      </div>
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
  now,
  editingNotes,
  notesDraft,
  onNotesStart,
  onNotesCancel,
  onNotesSave,
  onNotesChange,
}: {
  order: AdminOrder
  rowIndex: number
  selected?: boolean
  onToggleSelect?: () => void
  updating: boolean
  onOpen: () => void
  onStatusChange: (status: OrderStatus) => void
  now?: number
  editingNotes: boolean
  notesDraft: string
  onNotesStart: () => void
  onNotesCancel: () => void
  onNotesSave: (draft: string) => void
  onNotesChange: (value: string) => void
}) {
  const firstItem = order.items[0]
  const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const printTime = order.items.reduce((sum, item) => sum + item.estimatedTime, 0)
  const totalDiscount = order.discountAmount ?? order.cartDiscountAmount + order.couponDiscountAmount + order.offerDiscountAmount
  const totalDiscountPercent = discountPercent(order.totalPriceBeforeDiscount, totalDiscount)
  const rowTone = rowIndex % 2 === 0 ? 'bg-white' : 'bg-gray-50/60'
  const statusOptions = getAllowedOrderStatusTransitions(order.status)
  const ageMs = statusAgeMs(order, now)
  const ageLevel = ageSlaLevel(order.status, ageMs)

  return (
    <tr
      onClick={onOpen}
      className={`cursor-pointer border-l-2 transition hover:bg-gray-50 ${
        order.status === 'pending' ? 'border-l-yellow-400' : ageRowLeftBorderClass(ageLevel)
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
        <span
          title={`In current status for ${formatAge(ageMs)}`}
          className={`mt-1.5 inline-flex rounded-full border px-2 py-0.5 text-[11px] font-medium ${ageSlaClass(ageLevel)}`}
        >
          {formatAge(ageMs)}
        </span>
      </td>
      <td className="hidden border-b border-gray-100 px-4 py-4 align-top text-gray-600 xl:table-cell">
        {formatNumber(printTime, 1)} hrs
      </td>
      <td className="border-b border-gray-100 px-4 py-4 align-top">
        <div className="text-gray-900">{formatDate(order.createdAt)}</div>
        <div className="mt-1 text-xs text-gray-500">{formatTime(order.createdAt)}</div>
      </td>
      <td className="hidden border-b border-gray-100 px-4 py-4 align-top xl:table-cell" onClick={(event) => event.stopPropagation()}>
        <NotesCell
          notes={order.notes ?? ''}
          editing={editingNotes}
          draft={notesDraft}
          onStart={onNotesStart}
          onCancel={onNotesCancel}
          onSave={(draft) => onNotesSave(draft)}
          onChange={onNotesChange}
        />
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
  now,
  editingNotes,
  notesDraft,
  onNotesStart,
  onNotesCancel,
  onNotesSave,
  onNotesChange,
}: {
  order: AdminOrder
  selected?: boolean
  onToggleSelect?: () => void
  updating: boolean
  onOpen: () => void
  onStatusChange: (status: OrderStatus) => void
  now?: number
  editingNotes: boolean
  notesDraft: string
  onNotesStart: () => void
  onNotesCancel: () => void
  onNotesSave: (draft: string) => void
  onNotesChange: (value: string) => void
}) {
  const firstItem = order.items[0]
  const quantity = order.items.reduce((sum, item) => sum + item.quantity, 0)
  const printTime = order.items.reduce((sum, item) => sum + item.estimatedTime, 0)
  const totalDiscount = order.discountAmount ?? order.cartDiscountAmount + order.couponDiscountAmount + order.offerDiscountAmount
  const totalDiscountPercent = discountPercent(order.totalPriceBeforeDiscount, totalDiscount)
  const statusOptions = getAllowedOrderStatusTransitions(order.status)
  const ageMs = statusAgeMs(order, now)
  const ageLevel = ageSlaLevel(order.status, ageMs)

  return (
    <article
      className={`w-full overflow-hidden rounded-xl border border-gray-200 bg-white p-4 shadow-sm transition hover:bg-gray-50 ${
        order.status === 'pending' ? 'border-l-4 border-l-yellow-400' : `border-l-4 ${ageRowLeftBorderClass(ageLevel)}`
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
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${statusPillClass(order.status)}`}>
            {STATUS_LABELS[order.status]}
          </span>
          <span
            title={`In current status for ${formatAge(ageMs)}`}
            className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${ageSlaClass(ageLevel)}`}
          >
            {formatAge(ageMs)}
          </span>
        </div>
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

      <div className="mt-3" onClick={(event) => event.stopPropagation()}>
          <NotesCell
            notes={order.notes ?? ''}
            editing={editingNotes}
            draft={notesDraft}
            onStart={onNotesStart}
            onCancel={onNotesCancel}
            onSave={(draft) => onNotesSave(draft)}
            onChange={onNotesChange}
          />
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

function NotesCell({
  notes,
  editing,
  draft,
  onStart,
  onCancel,
  onSave,
  onChange,
}: {
  notes: string
  editing: boolean
  draft: string
  onStart: () => void
  onCancel: () => void
  onSave: (draft: string) => void
  onChange: (value: string) => void
}) {
  if (editing) {
    return (
      <div className="flex flex-col gap-1.5">
        <textarea
          value={draft}
          onChange={(event) => onChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault()
              onCancel()
            } else if (event.key === 'Enter' && (event.metaKey || event.ctrlKey)) {
              event.preventDefault()
              onSave(draft)
            }
          }}
          aria-label="Order notes"
          rows={3}
          autoFocus
          placeholder="Add internal notes..."
          className="w-full rounded-lg border border-violet-300 bg-white px-2.5 py-1.5 text-xs text-gray-900 outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
        />
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onSave(draft)}
            className="inline-flex h-7 items-center rounded-lg bg-violet-600 px-2.5 text-xs font-semibold text-white transition hover:bg-violet-700"
          >
            Save
          </button>
          <button
            type="button"
            onClick={onCancel}
            className="inline-flex h-7 items-center rounded-lg border border-gray-300 bg-white px-2.5 text-xs font-medium text-gray-700 transition hover:bg-gray-50"
          >
            Cancel
          </button>
          <span className="text-[10px] text-gray-400">Ctrl+Enter to save</span>
        </div>
      </div>
    )
  }

  return (
    <button
      type="button"
      onClick={onStart}
      className="group flex w-full max-w-[240px] items-start gap-1.5 rounded-lg px-1.5 py-1 text-left transition hover:bg-violet-50"
      title="Click to edit notes"
    >
      {notes ? (
        <span className="line-clamp-3 text-xs text-gray-600">{notes}</span>
      ) : (
        <span className="text-xs italic text-gray-400">No notes</span>
      )}
      <PencilLine className="ml-auto h-3 w-3 shrink-0 opacity-0 transition group-hover:opacity-100" />
    </button>
  )
}

function Pagination({
  filteredCount,
  currentPage,
  totalPages,
  serverTotal,
  fetching,
  pageSize,
  onPageSizeChange,
  setPage,
}: {
  filteredCount: number
  currentPage: number
  totalPages: number
  serverTotal?: number
  fetching?: boolean
  pageSize: number
  onPageSizeChange: (size: number) => void
  setPage: Dispatch<SetStateAction<number>>
}) {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-gray-200 bg-white px-4 py-3">
      <div className="text-sm text-gray-600">
        Showing {filteredCount === 0 ? 0 : (currentPage - 1) * pageSize + 1}
        {' '}–{' '}
        {Math.min(currentPage * pageSize, filteredCount)} of {filteredCount.toLocaleString('en-IN')}
        {serverTotal != null && serverTotal > filteredCount && (
          <span className="text-gray-400"> (filtered from {serverTotal.toLocaleString('en-IN')} total)</span>
        )}
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-gray-600">
          <span className="whitespace-nowrap">Per page</span>
          <select
            value={pageSize}
            onChange={(event) => onPageSizeChange(Number(event.target.value))}
            className="h-9 rounded-lg border border-gray-300 bg-white px-2 text-sm text-gray-900 outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size}
              </option>
            ))}
          </select>
        </label>
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
