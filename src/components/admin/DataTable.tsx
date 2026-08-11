'use client'

import { useDeferredValue, useEffect, useState } from 'react'
import { ArrowDownWideNarrow, ArrowUpWideNarrow, ChevronLeft, ChevronRight, Search, Filter, Download } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { logSearch } from '@/lib/tracking/searchLogger'

type FilterOption = {
  label: string
  value: string
}

type FilterConfig<T> = {
  key: string
  label: string
  options: FilterOption[]
  getValue: (row: T) => string
}

type Column<T> = {
  key: string
  label: React.ReactNode
  sortable?: boolean
  className?: string
  render: (row: T) => React.ReactNode
  sortValue?: (row: T) => string | number
  exportValue?: (row: T) => string | number | null
}

function toCsvValue(value: string | number | null) {
  if (value === null || value === undefined) return ''
  const stringified = String(value)
  return /[",\n]/.test(stringified) ? `"${stringified.replace(/"/g, '""')}"` : stringified
}

function exportRowsToCsv<T>(
  rows: T[],
  columns: Column<T>[],
  filename: string
) {
  const exportColumns = columns.filter((column) => column.exportValue)
  if (exportColumns.length === 0) return

  const header = exportColumns.map((column) =>
    typeof column.label === 'string' ? column.label : column.key
  )
  const lines = rows.map((row) =>
    exportColumns.map((column) => toCsvValue(column.exportValue?.(row) ?? null)).join(',')
  )

  const csv = [header.join(','), ...lines].join('\n')
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  URL.revokeObjectURL(url)
}

export default function DataTable<T extends { id: string }>({
  title,
  description,
  data,
  columns,
  searchPlaceholder,
  searchKeys,
  filters = [],
  onRowClick,
  action,
  exportFilename,
}: {
  title: string
  description: string
  data: T[]
  columns: Column<T>[]
  searchPlaceholder: string
  searchKeys: (keyof T)[]
  filters?: FilterConfig<T>[]
  onRowClick?: (row: T) => void
  action?: React.ReactNode
  exportFilename?: string
}) {
  const [query, setQuery] = useState('')
  const deferredQuery = useDeferredValue(query)
  const [sortKey, setSortKey] = useState<string | null>(columns.find((column) => column.sortable)?.key ?? null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>(
    Object.fromEntries(filters.map((filter) => [filter.key, 'all']))
  )
  const [showFilters, setShowFilters] = useState(false)

  const rows = data
    .filter((row) => {
      const matchesSearch =
        deferredQuery.trim().length === 0 ||
        searchKeys.some((key) =>
          String(row[key] ?? '')
            .toLowerCase()
            .includes(deferredQuery.toLowerCase())
        )

      const matchesFilters = filters.every((filter) => {
        const currentValue = activeFilters[filter.key]
        return currentValue === 'all' || filter.getValue(row) === currentValue
      })

      return matchesSearch && matchesFilters
    })
    .sort((left, right) => {
      if (!sortKey) return 0

      const column = columns.find((item) => item.key === sortKey)
      if (!column?.sortValue) return 0

      const leftValue = column.sortValue(left)
      const rightValue = column.sortValue(right)
      const result = leftValue > rightValue ? 1 : leftValue < rightValue ? -1 : 0
      return sortDirection === 'asc' ? result : -result
    })

  const pageSize = 8
  const totalPages = Math.max(Math.ceil(rows.length / pageSize), 1)
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize)

  const activeFilterCount = Object.values(activeFilters).filter((v) => v !== 'all').length
  const activeFiltersKey = JSON.stringify(activeFilters)

  useEffect(() => {
    const hasSearch = deferredQuery.trim().length > 0
    const hasFilters = Object.values(activeFilters).some((value) => value !== 'all')
    if (!hasSearch && !hasFilters) return

    const timeout = window.setTimeout(() => {
      void logSearch(null, deferredQuery.trim() || null, {
        table: title,
        filters: activeFilters,
        sortKey,
        sortDirection,
      }, rows.length).catch(() => {})
    }, 500)

    return () => window.clearTimeout(timeout)
  }, [activeFilters, activeFiltersKey, deferredQuery, rows.length, sortDirection, sortKey, title])

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-[#FFFFFF]">
      <div className="border-b border-gray-200 px-4 py-4 md:px-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-base md:text-lg font-semibold text-[#0F1B3D]">{title}</h3>
            <p className="mt-1 text-xs md:text-sm text-[#6F7192]">{description}</p>
          </div>
          {action && <div className="w-full lg:w-auto">{action}</div>}
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7192]" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 py-3 px-10 text-sm text-[#0F1B3D] outline-none transition focus:border-[#6d28d9]/30 min-h-[44px]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {exportFilename && (
              <button
                type="button"
                onClick={() => exportRowsToCsv(rows, columns, exportFilename)}
                className="inline-flex items-center gap-2 rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3.5 py-2.5 text-sm text-[#6F7192] transition whitespace-nowrap min-h-[44px] hover:bg-gray-100 hover:text-[#0F1B3D]"
              >
                <Download className="h-3.5 w-3.5" />
                Export CSV
              </button>
            )}
            {filters.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition whitespace-nowrap min-h-[44px] ${
                  showFilters || activeFilterCount > 0
                    ? 'border-[#6d28d9]/30 bg-[#6d28d9]/10 text-[#6d28d9]'
                    : 'border-[#6d28d9]/10 bg-gray-50 text-[#6F7192] hover:bg-gray-100'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#6d28d9] text-[9px] font-bold text-white">
                    {activeFilterCount}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>

        <AnimatePresence>
          {showFilters && filters.length > 0 && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              className="overflow-hidden"
            >
              <div className="mt-3 flex flex-wrap gap-2 border-t border-[#6d28d9]/10 pt-3">
                {filters.map((filter) => (
                  <select
                    key={filter.key}
                    value={activeFilters[filter.key]}
                    onChange={(event) => {
                      setActiveFilters((current) => ({
                        ...current,
                        [filter.key]: event.target.value,
                      }))
                      setPage(1)
                    }}
                    className="rounded-lg border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-xs text-[#0F1B3D] outline-none min-h-[44px]"
                  >
                    <option value="all" className="bg-[#FFFFFF]">
                      {filter.label}: All
                    </option>
                    {filter.options.map((option) => (
                      <option key={option.value} value={option.value} className="bg-[#FFFFFF]">
                        {option.label}
                      </option>
                    ))}
                  </select>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Mobile Card View */}
      <div className="block md:hidden">
        {paginatedRows.length === 0 ? (
          <div className="px-4 py-12 text-center text-sm text-[#6F7192]">
            No results found
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {paginatedRows.map((row) => (
              <div
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={`p-4 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
              >
                {columns.slice(0, 4).map((column) => (
                  <div key={column.key} className="flex justify-between items-center py-1.5">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-[#6F7192]">
                      {column.label}
                    </span>
                    <span className="text-sm text-[#6F7192]">
                      {column.render(row)}
                    </span>
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto">
        <table className="min-w-full">
          <thead>
            <tr className="border-b border-gray-100">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-5 py-3 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192] ${column.className ?? ''}`}
                >
                  {column.sortable ? (
                  <button
                    type="button"
                    onClick={() => {
                      if (sortKey === column.key) {
                        setSortDirection((current) => (current === 'asc' ? 'desc' : 'asc'))
                      } else {
                        setSortKey(column.key)
                        setSortDirection('desc')
                      }
                    }}
                    className="inline-flex items-center gap-1.5 hover:text-[#6F7192]"
                  >
                    {column.label}
                    {sortKey === column.key ? (
                      sortDirection === 'asc' ? (
                        <ArrowUpWideNarrow className="h-3 w-3" />
                      ) : (
                        <ArrowDownWideNarrow className="h-3 w-3" />
                      )
                    ) : null}
                  </button>
                ) : (
                  column.label
                )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginatedRows.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-[#6F7192]">
                  No results found
                </td>
              </tr>
            ) : (
              paginatedRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={`border-b border-gray-100 transition-colors last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={`px-5 py-3.5 text-sm text-[#6F7192] ${column.className ?? ''}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
          <div className="text-xs text-[#6F7192] text-center md:text-left">
            {rows.length === 0 ? 'No items' : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, rows.length)} of ${rows.length}`}
          </div>
          <div className="flex items-center justify-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={page === 1}
              className="rounded-lg border border-[#6d28d9]/10 bg-gray-50 p-2 text-[#6F7192] transition disabled:opacity-30 hover:enabled:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
              let p;
              if (totalPages <= 5) {
                p = i + 1;
              } else if (page <= 3) {
                p = i + 1;
              } else if (page >= totalPages - 2) {
                p = totalPages - 4 + i;
              } else {
                p = page - 2 + i;
              }
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  className={`h-9 min-w-[36px] rounded-lg text-xs font-medium transition ${
                    p === page
                      ? 'bg-[#6d28d9]/15 text-[#6d28d9]'
                      : 'text-[#6F7192] hover:bg-gray-100'
                  }`}
                >
                  {p}
                </button>
              );
            })}
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
              disabled={page === totalPages}
              className="rounded-lg border border-[#6d28d9]/10 bg-gray-50 p-2 text-[#6F7192] transition disabled:opacity-30 hover:enabled:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
export default function DataTable<T>({
  title,
  description,
  data,
  columns,
  searchPlaceholder,
  searchKeys = [],
  filters = [],
  onRowClick,
  action,
  exportFilename,
  pageSize = 10,
  emptyTitle = 'No records found',
  emptyDescription = 'Try adjusting your search or filters.',
  loading = false,
  serverSide = false,
  serverTotal,
  serverPage = 1,
  serverPageSize = 10,
  onServerSearch,
  onServerFilter,
  onServerSort,
  onServerPageChange,
  selectedIds = new Set<string>(),
  onSelectionChange,
  bulkActions,
  getRowId = defaultRowId,
}: DataTableProps<T>) {
  const [query, setQuery] = useState('')
  const [deferredQuery, setDeferredQuery] = useState('')
  const [sortKey, setSortKey] = useState(columns.find((column) => column.sortable)?.key ?? '')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc')
  const [page, setPage] = useState(1)
  const [activeFilters, setActiveFilters] = useState<Record<string, string>>({})
  const [showFilters, setShowFilters] = useState(false)

  useEffect(() => {
    if (!searchKeys.length) return
    const timeout = setTimeout(() => {
      setDeferredQuery(query)
    }, 350)
    return () => clearTimeout(timeout)
  }, [query, searchKeys.length])

  const filtered = serverSide
    ? data
    : data.filter((row) => {
        if (!deferredQuery || !searchKeys.length) return true
        const normalized = deferredQuery.toLowerCase()
        return searchKeys.some((key) => {
          const value = String((row as Record<string, unknown>)[key] ?? '')
          return value.toLowerCase().includes(normalized)
        })
      })

  const filteredByFilters = !serverSide && filters.length
    ? filtered.filter((row) => {
        return Object.entries(activeFilters).every(([key, filterValue]) => {
          if (filterValue === 'all') return true
          const config = filters.find((filter) => filter.key === key)
          if (!config) return true
          return config.getValue(row) === filterValue
        })
      })
    : filtered

  const sorted = !serverSide
    ? [...filteredByFilters].sort((a, b) => {
        if (!sortKey) return 0
        const column = columns.find((column) => column.key === sortKey)
        if (!column?.sortValue) return 0
        const left = column.sortValue(a) ?? ''
        const right = column.sortValue(b) ?? ''
        if (typeof left === 'number' && typeof right === 'number') {
          return sortDirection === 'asc' ? left - right : right - left
        }
        return String(left).localeCompare(String(right)) * (sortDirection === 'asc' ? 1 : -1)
      })
    : filteredByFilters

  const totalPages = serverSide
    ? Math.max(1, Math.ceil((serverTotal ?? data.length) / serverPageSize))
    : Math.max(1, Math.ceil(sorted.length / pageSize))

  const rows = serverSide ? sorted : sorted.slice((page - 1) * pageSize, page * pageSize)

  const effectivePage = serverSide ? serverPage : page
  const effectiveTotal = serverSide ? (serverTotal ?? rows.length) : sorted.length
  const from = effectiveTotal === 0 ? 0 : (effectivePage - 1) * (serverSide ? serverPageSize : pageSize) + 1
  const to = Math.min(effectivePage * (serverSide ? serverPageSize : pageSize), effectiveTotal)

  const handleSort = (key: string) => {
    const direction = key === sortKey && sortDirection === 'desc' ? 'asc' : 'desc'
    setSortKey(key)
    setSortDirection(direction)
    if (serverSide) onServerSort?.(key, direction)
  }

  const handleSearchChange = (value: string) => {
    setQuery(value)
    setPage(1)
    if (serverSide) onServerSearch?.(value)
  }

  const handleFilterChange = (key: string, value: string) => {
    const next = { ...activeFilters, [key]: value }
    setActiveFilters(next)
    setPage(1)
    if (serverSide) onServerFilter?.(next)
  }

  const handlePageChange = (nextPage: number) => {
    setPage(nextPage)
    if (serverSide) {
      onServerPageChange?.(nextPage)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
    }
  }

  const visibleIds = rows.map((row) => getRowId(row))
  const allVisibleSelected = visibleIds.length > 0 && visibleIds.every((id) => selectedIds.has(id))

  const toggleAllVisible = () => {
    if (!onSelectionChange) return
    const next = new Set(selectedIds)
    if (allVisibleSelected) {
      visibleIds.forEach((id) => next.delete(id))
    } else {
      visibleIds.forEach((id) => next.add(id))
    }
    onSelectionChange(next)
  }

  const toggleRow = (id: string) => {
    if (!onSelectionChange) return
    const next = new Set(selectedIds)
    if (next.has(id)) {
      next.delete(id)
    } else {
      next.add(id)
    }
    onSelectionChange(next)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-24 animate-pulse rounded-2xl bg-gray-800/50" />
        <div className="space-y-3">
          {[0, 1, 2].map((item) => (
            <div key={item} className="h-14 animate-pulse rounded-xl bg-gray-800/50" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div>
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          {title && <h2 className="text-base font-semibold text-white">{title}</h2>}
          {description && <p className="text-xs text-gray-500">{description}</p>}
        </div>
        {exportFilename || action ? (
          <div className="flex items-center gap-2">
            {action}
            {exportFilename && (
              <button
                type="button"
                onClick={() => exportRowsToCsv(filteredByFilters, columns, exportFilename)}
                className="rounded-lg border border-gray-700 px-3 py-1.5 text-xs font-medium text-gray-300 transition hover:bg-gray-800"
              >
                <span className="inline-flex items-center gap-1.5"><Download size={14} /> Export</span>
              </button>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3">
        {searchKeys.length > 0 && (
          <div className="relative w-full sm:w-64">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
            <input
              type="text"
              value={query}
              onChange={(event) => handleSearchChange(event.target.value)}
              placeholder={searchPlaceholder ?? 'Search...'}
              className="w-full rounded-lg border border-gray-800 bg-[#0B1220] py-2 pl-9 pr-3 text-sm text-gray-200 outline-none transition focus:border-indigo-500"
            />
          </div>
        )}
        {filters.length > 0 && (
          <>
            <button
              type="button"
              onClick={() => setShowFilters((current) => !current)}
              className={`inline-flex items-center gap-1.5 rounded-lg border border-gray-800 px-3 py-2 text-xs font-medium transition ${
                showFilters ? 'bg-indigo-500/10 text-indigo-300 border-indigo-500/50' : 'text-gray-300 hover:bg-gray-800'
              }`}
            >
              <Filter size={14} />
              Filters
              {Object.values(activeFilters).some((value) => value !== 'all') && (
                <span className="rounded-full bg-indigo-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                  {Object.values(activeFilters).filter((value) => value !== 'all').length}
                </span>
              )}
            </button>
            <AnimatePresence initial={false}>
              {showFilters && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -4 }}
                  className="flex flex-wrap items-center gap-3"
                >
                  {filters.map((filter) => (
                    <FilterDropdown
                      key={filter.key}
                      label={filter.label}
                      options={filter.options}
                      value={activeFilters[filter.key] ?? 'all'}
                      onChange={(value) => handleFilterChange(filter.key, value)}
                    />
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>

      {selectedIds.size > 0 && bulkActions && (
        <div className="mt-3 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-indigo-500/40 bg-indigo-500/10 px-4 py-3">
          <p className="text-xs font-medium text-indigo-200">{selectedIds.size} selected</p>
          <div className="flex items-center gap-2">{bulkActions}</div>
        </div>
      )}

      <div className="mt-3 hidden overflow-x-auto md:block">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-[#0B1220] px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-300">{emptyTitle}</p>
            <p className="mt-1 text-xs text-gray-500">{emptyDescription}</p>
          </div>
        ) : (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="border-b border-gray-800">
                {onSelectionChange && (
                  <th className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={allVisibleSelected}
                      onChange={toggleAllVisible}
                      className="h-4 w-4 accent-indigo-500"
                    />
                  </th>
                )}
                {columns.map((column) => (
                  <th key={column.key} className="px-4 py-3">
                    {column.sortable ? (
                      <button
                        type="button"
                        onClick={() => handleSort(column.key)}
                        className="inline-flex items-center text-xs font-medium text-gray-400 transition hover:text-white"
                      >
                        {column.label}
                        <SortIcon active={sortKey === column.key} direction={sortDirection} />
                      </button>
                    ) : (
                      <span className="inline-flex items-center text-xs font-medium text-gray-400">
                        {column.label}
                      </span>
                    )}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => {
                const rowId = getRowId(row)
                return (
                  <tr
                    key={rowId}
                    onClick={() => onRowClick?.(row)}
                    className="cursor-pointer border-b border-gray-800/60 transition hover:bg-gray-800/30"
                  >
                    {onSelectionChange && (
                      <td className="px-4 py-3">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(rowId)}
                          onChange={(event) => {
                            event.stopPropagation()
                            toggleRow(rowId)
                          }}
                          className="h-4 w-4 accent-indigo-500"
                        />
                      </td>
                    )}
                    {columns.map((column) => (
                      <td key={column.key} className={`px-4 py-3 ${column.className ?? ''}`}>
                        {column.render(row)}
                      </td>
                    ))}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-3 grid gap-3 md:hidden">
        {rows.length === 0 ? (
          <div className="rounded-2xl border border-gray-800 bg-[#0B1220] px-6 py-12 text-center">
            <p className="text-sm font-medium text-gray-300">{emptyTitle}</p>
            <p className="mt-1 text-xs text-gray-500">{emptyDescription}</p>
          </div>
        ) : (
          rows.map((row) => (
            <div key={getRowId(row)} className="relative">
              {onSelectionChange && (
                <div className="absolute right-3 top-3 z-10">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(getRowId(row))}
                    onChange={(event) => {
                      event.stopPropagation()
                      toggleRow(getRowId(row))
                    }}
                    className="h-4 w-4 accent-indigo-500"
                  />
                </div>
              )}
              <MobileCard row={row} columns={columns} onClick={onRowClick} />
            </div>
          ))
        )}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-500">
          Showing {from}–{to} of {effectiveTotal} records
        </p>
        <Pagination
          currentPage={effectivePage}
          totalPages={totalPages}
          onPageChange={handlePageChange}
        />
      </div>
    </div>
  )
}
