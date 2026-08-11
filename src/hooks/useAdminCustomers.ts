'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import type { AdminCustomerStatus, AdminUser } from '@/lib/admin/types'
import { logSearch } from '@/lib/tracking/searchLogger'

export const CUSTOMER_PAGE_SIZE = 12

export type CustomerSortColumn = 'created_at' | 'last_seen_at' | 'total_orders' | 'total_spent' | 'last_order_date' | 'name'

export type CustomerSort = {
  sortBy: CustomerSortColumn
  sortDir: 'asc' | 'desc'
}

export type CustomerListStats = {
  total: number
  newThisMonth: number
  active: number
  suspended: number
}

type UseAdminCustomersOptions = {
  initialCustomers: AdminUser[]
  initialTotal: number
}

function buildListParams(query: string, status: 'all' | AdminCustomerStatus, sort: CustomerSort, page: number) {
  const params = new URLSearchParams()
  const trimmed = query.trim().slice(0, 200)
  if (trimmed) params.set('query', trimmed)
  if (status !== 'all') params.set('status', status)
  params.set('sortBy', sort.sortBy)
  params.set('sortDir', sort.sortDir)
  params.set('page', String(page))
  params.set('limit', String(CUSTOMER_PAGE_SIZE))
  return params.toString()
}

export function useAdminCustomers({ initialCustomers, initialTotal }: UseAdminCustomersOptions) {
  const [query, setQuery] = useState('')
  const [debouncedQuery, setDebouncedQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | AdminCustomerStatus>('all')
  const [sort, setSort] = useState<CustomerSort>({ sortBy: 'created_at', sortDir: 'desc' })
  const [page, setPage] = useState(1)
  const [customers, setCustomers] = useState<AdminUser[]>(initialCustomers)
  const [total, setTotal] = useState(initialTotal)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [stats, setStats] = useState<CustomerListStats | null>(null)
  const [statsLoading, setStatsLoading] = useState(true)
  const requestSeq = useRef(0)
  const refreshKeyRef = useRef(0)
  const [refreshKey, setRefreshKey] = useState(0)

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedQuery(query.trim()), 350)
    return () => window.clearTimeout(timeout)
  }, [query])

  const triggerRefresh = useCallback(() => {
    refreshKeyRef.current += 1
    setRefreshKey(refreshKeyRef.current)
    setLoading(true)
    setStatsLoading(true)
    setError(null)
  }, [])

  const handleQueryChange = useCallback((value: string) => {
    setQuery(value)
    setPage(1)
    setLoading(true)
    setError(null)
  }, [])

  const handleStatusChange = useCallback((value: 'all' | AdminCustomerStatus) => {
    setStatusFilter(value)
    setPage(1)
    setLoading(true)
    setError(null)
  }, [])

  const handleServerSort = useCallback((next: CustomerSort) => {
    setSort(next)
    setPage(1)
    setLoading(true)
    setError(null)
  }, [])

  const handlePageChange = useCallback((updater: number | ((value: number) => number)) => {
    setPage(updater)
    setLoading(true)
    setError(null)
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    const seq = ++requestSeq.current

    const params = buildListParams(debouncedQuery, statusFilter, sort, page)

    fetch(`/api/admin/customers?${params}`, { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load customers.')
        }
        return response.json() as Promise<{ customers: AdminUser[]; total: number }>
      })
      .then((json) => {
        if (seq !== requestSeq.current) return
        setCustomers(json.customers ?? [])
        setTotal(json.total ?? 0)
        void logSearch(
          null,
          debouncedQuery || null,
          { area: 'admin_customers', status: statusFilter, sortBy: sort.sortBy, sortDir: sort.sortDir, page },
          json.total ?? 0
        ).catch(() => {})
      })
      .catch((fetchError: unknown) => {
        if (seq !== requestSeq.current || (fetchError instanceof Error && fetchError.name === 'AbortError')) return
        setError(fetchError instanceof Error ? fetchError.message : 'Failed to load customers.')
      })
      .finally(() => {
        if (seq === requestSeq.current) setLoading(false)
      })

    return () => controller.abort()
  }, [debouncedQuery, statusFilter, sort, page, refreshKey])

  useEffect(() => {
    const controller = new AbortController()

    fetch('/api/admin/customers/stats', { signal: controller.signal })
      .then(async (response) => {
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load customer stats.')
        }
        return response.json() as Promise<CustomerListStats>
      })
      .then((json) => setStats(json))
      .catch((fetchError: unknown) => {
        if (fetchError instanceof Error && fetchError.name === 'AbortError') return
        console.error(fetchError)
      })
      .finally(() => setStatsLoading(false))

    return () => controller.abort()
  }, [refreshKey])

  return {
    customers,
    total,
    loading,
    error,
    page,
    query,
    debouncedQuery,
    statusFilter,
    sort,
    stats,
    statsLoading,
    setQuery: handleQueryChange,
    setStatusFilter: handleStatusChange,
    setServerSort: handleServerSort,
    setPage: handlePageChange,
    refresh: triggerRefresh,
  }
}
