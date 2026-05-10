'use client'

import { useDeferredValue, useState } from 'react'
import { ArrowDownWideNarrow, ArrowUpWideNarrow, ChevronLeft, ChevronRight, Search, Filter } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

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
  label: string
  sortable?: boolean
  className?: string
  render: (row: T) => React.ReactNode
  sortValue?: (row: T) => string | number
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

  return (
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#FFFFFF]">
      <div className="border-b border-white/[0.06] px-4 py-4 md:px-5">
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
              className="w-full rounded-xl border border-[#7C5CFF]/10 bg-white/[0.03] py-3 px-10 text-sm text-[#0F1B3D] outline-none transition focus:border-[#7C5CFF]/30 min-h-[44px]"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {filters.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition whitespace-nowrap min-h-[44px] ${
                  showFilters || activeFilterCount > 0
                    ? 'border-[#7C5CFF]/30 bg-[#7C5CFF]/10 text-[#7C5CFF]'
                    : 'border-[#7C5CFF]/10 bg-white/[0.03] text-[#8b95b5] hover:bg-white/[0.06]'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#7C5CFF] text-[9px] font-bold text-white">
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
              <div className="mt-3 flex flex-wrap gap-2 border-t border-[#7C5CFF]/10 pt-3">
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
                    className="rounded-lg border border-[#7C5CFF]/10 bg-white/[0.03] px-3 py-2.5 text-xs text-[#0F1B3D] outline-none min-h-[44px]"
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
          <div className="divide-y divide-white/[0.03]">
            {paginatedRows.map((row) => (
              <div
                key={row.id}
                onClick={() => onRowClick?.(row)}
                className={`p-4 transition-colors ${onRowClick ? 'cursor-pointer hover:bg-white/[0.02]' : ''}`}
              >
                {columns.slice(0, 4).map((column) => (
                  <div key={column.key} className="flex justify-between items-center py-1.5">
                    <span className="text-[10px] uppercase tracking-[0.15em] text-[#5a6580]">
                      {column.label}
                    </span>
                    <span className="text-sm text-[#c6cee5]">
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
            <tr className="border-b border-white/[0.04]">
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={`px-5 py-3 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-[#5a6580] ${column.className ?? ''}`}
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
                    className="inline-flex items-center gap-1.5 hover:text-[#8b95b5]"
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
                  className={`border-b border-white/[0.03] transition-colors last:border-0 ${onRowClick ? 'cursor-pointer hover:bg-white/[0.02]' : ''}`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={`px-5 py-3.5 text-sm text-[#c6cee5] ${column.className ?? ''}`}>
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
        <div className="flex flex-col gap-3 border-t border-white/[0.04] px-4 py-3 md:flex-row md:items-center md:justify-between md:px-5">
          <div className="text-xs text-[#5a6580] text-center md:text-left">
            {rows.length === 0 ? 'No items' : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, rows.length)} of ${rows.length}`}
          </div>
          <div className="flex items-center justify-center gap-1.5 overflow-x-auto">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={page === 1}
              className="rounded-lg border border-[#7C5CFF]/10 bg-white/[0.02] p-2 text-[#6F7192] transition disabled:opacity-30 hover:enabled:bg-white/[0.06] min-h-[44px] min-w-[44px] flex items-center justify-center"
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
                      ? 'bg-[#7C5CFF]/15 text-[#7C5CFF]'
                      : 'text-[#6F7192] hover:bg-white/[0.04]'
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
              className="rounded-lg border border-[#7C5CFF]/10 bg-white/[0.02] p-2 text-[#6F7192] transition disabled:opacity-30 hover:enabled:bg-white/[0.06] min-h-[44px] min-w-[44px] flex items-center justify-center"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
