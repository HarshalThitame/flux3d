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
