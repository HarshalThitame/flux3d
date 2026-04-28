'use client'

import { useDeferredValue, useState } from 'react'
import { ArrowDownWideNarrow, ArrowUpWideNarrow, ChevronLeft, ChevronRight, Search } from 'lucide-react'

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
      if (!sortKey) {
        return 0
      }

      const column = columns.find((item) => item.key === sortKey)
      if (!column?.sortValue) {
        return 0
      }

      const leftValue = column.sortValue(left)
      const rightValue = column.sortValue(right)
      const result = leftValue > rightValue ? 1 : leftValue < rightValue ? -1 : 0
      return sortDirection === 'asc' ? result : -result
    })

  const pageSize = 5
  const totalPages = Math.max(Math.ceil(rows.length / pageSize), 1)
  const paginatedRows = rows.slice((page - 1) * pageSize, page * pageSize)

  return (
    <div className="rounded-[28px] border border-white/10 bg-[rgba(10,16,31,0.94)] p-6 shadow-[0_18px_60px_rgba(0,0,0,0.18)]">
      <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h3 className="font-[var(--font-syne)] text-2xl font-bold text-white">{title}</h3>
          <p className="mt-2 text-sm text-[#97a2c3]">{description}</p>
        </div>
        {action}
      </div>

      <div className="mt-5 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <label className="relative block w-full lg:max-w-sm">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#7f8aac]" />
          <input
            value={query}
            onChange={(event) => {
              setQuery(event.target.value)
              setPage(1)
            }}
            placeholder={searchPlaceholder}
            className="w-full rounded-[18px] border border-white/10 bg-[#0f182c] py-3 pl-11 pr-4 text-sm text-white outline-none transition focus:border-[#FF7B43]/40"
          />
        </label>

        <div className="flex flex-wrap gap-3">
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
              className="rounded-[16px] border border-white/10 bg-[#0f182c] px-4 py-3 text-sm text-white outline-none"
            >
              <option value="all">{filter.label}: All</option>
              {filter.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          ))}
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-[24px] border border-white/8">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead className="bg-white/[0.03]">
              <tr>
                {columns.map((column) => (
                  <th
                    key={column.key}
                    className={`px-4 py-4 text-left text-xs uppercase tracking-[0.18em] text-[#7f8aac] ${column.className ?? ''}`}
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
                        className="inline-flex items-center gap-2"
                      >
                        {column.label}
                        {sortKey === column.key ? (
                          sortDirection === 'asc' ? (
                            <ArrowUpWideNarrow className="h-3.5 w-3.5" />
                          ) : (
                            <ArrowDownWideNarrow className="h-3.5 w-3.5" />
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
              {paginatedRows.map((row) => (
                <tr
                  key={row.id}
                  onClick={() => onRowClick?.(row)}
                  className={`border-t border-white/8 transition ${onRowClick ? 'cursor-pointer hover:bg-white/[0.03]' : ''}`}
                >
                  {columns.map((column) => (
                    <td key={column.key} className={`px-4 py-4 text-sm text-[#d8def1] ${column.className ?? ''}`}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="mt-4 flex items-center justify-between text-sm text-[#90a0c2]">
        <div>
          Showing {rows.length === 0 ? 0 : (page - 1) * pageSize + 1}-
          {Math.min(page * pageSize, rows.length)} of {rows.length}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setPage((current) => Math.max(current - 1, 1))}
            disabled={page === 1}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-2 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2">
            {page} / {totalPages}
          </div>
          <button
            type="button"
            onClick={() => setPage((current) => Math.min(current + 1, totalPages))}
            disabled={page === totalPages}
            className="rounded-xl border border-white/10 bg-white/[0.03] p-2 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  )
}
