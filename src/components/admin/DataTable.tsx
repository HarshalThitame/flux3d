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
    <div className="overflow-hidden rounded-2xl border border-white/[0.06] bg-[#0a0f1e]">
      <div className="border-b border-white/[0.06] px-5 py-4">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <h3 className="text-lg font-semibold text-white">{title}</h3>
            <p className="mt-1 text-sm text-[#7a82a0]">{description}</p>
          </div>
          {action}
        </div>

        <div className="mt-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative flex-1 lg:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7a82a0]" />
            <input
              value={query}
              onChange={(event) => {
                setQuery(event.target.value)
                setPage(1)
              }}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-white/8 bg-white/[0.03] py-2.5 pl-10 pr-4 text-sm text-white outline-none transition focus:border-[#FF5C1A]/30"
            />
          </div>

          <div className="flex items-center gap-2">
            {filters.length > 0 && (
              <button
                type="button"
                onClick={() => setShowFilters((v) => !v)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition ${
                  showFilters || activeFilterCount > 0
                    ? 'border-[#FF5C1A]/30 bg-[#FF5C1A]/10 text-[#FF9A72]'
                    : 'border-white/8 bg-white/[0.03] text-[#8b95b5] hover:bg-white/[0.06]'
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#FF5C1A] text-[9px] font-bold text-white">
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
              <div className="mt-3 flex flex-wrap gap-2 border-t border-white/6 pt-3">
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
                    className="rounded-lg border border-white/8 bg-white/[0.03] px-3 py-2 text-xs text-white outline-none"
                  >
                    <option value="all" className="bg-[#0d1120]">
                      {filter.label}: All
                    </option>
                    {filter.options.map((option) => (
                      <option key={option.value} value={option.value} className="bg-[#0d1120]">
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

      <div className="overflow-x-auto">
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
                <td colSpan={columns.length} className="px-5 py-12 text-center text-sm text-[#7a82a0]">
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
        <div className="flex items-center justify-between border-t border-white/[0.04] px-5 py-3">
          <div className="text-xs text-[#5a6580]">
            {rows.length === 0 ? 'No items' : `Showing ${(page - 1) * pageSize + 1}–${Math.min(page * pageSize, rows.length)} of ${rows.length}`}
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setPage((current) => Math.max(current - 1, 1))}
              disabled={page === 1}
              className="rounded-lg border border-white/6 bg-white/[0.02] p-1.5 text-[#7a82a0] transition disabled:opacity-30 hover:enabled:bg-white/[0.06]"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => setPage(p)}
                className={`h-7 w-7 rounded-lg text-xs font-medium transition ${
                  p === page
                    ? 'bg-[#FF5C1A]/15 text-[#FF9A72]'
                    : 'text-[#7a82a0] hover:bg-white/[0.04]'
                }`}
              >
                {p}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
              disabled={page === totalPages}
              className="rounded-lg border border-white/6 bg-white/[0.02] p-1.5 text-[#7a82a0] transition disabled:opacity-30 hover:enabled:bg-white/[0.06]"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
