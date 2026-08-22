'use client'

import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import {
  ArrowDownWideNarrow,
  ArrowUpWideNarrow,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Search,
} from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

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
  label: ReactNode
  sortable?: boolean
  className?: string
  render: (row: T) => ReactNode
  sortValue?: (row: T) => string | number
  exportValue?: (row: T) => string | number | null
}

type DataTableProps<T> = {
  title?: string
  description?: string
  data: T[]
  columns: Column<T>[]
  searchPlaceholder?: string
  searchKeys?: string[]
  filters?: FilterConfig<T>[]
  onRowClick?: (row: T) => void
  action?: ReactNode
  exportFilename?: string
  pageSize?: number
  emptyTitle?: string
  emptyDescription?: string
  loading?: boolean
  serverSide?: boolean
  serverTotal?: number
  serverPage?: number
  serverPageSize?: number
  onServerSearch?: (query: string) => void
  onServerFilter?: (filters: Record<string, string>) => void
  onServerSort?: (key: string, direction: 'asc' | 'desc') => void
  onServerPageChange?: (page: number) => void
  selectedIds?: Set<string>
  onSelectionChange?: (ids: Set<string>) => void
  bulkActions?: ReactNode
  getRowId?: (row: T) => string
}

const defaultRowId = (row: unknown): string =>
  String((row as { id?: string | number })?.id ?? '')

function toCsvValue(value: string | number | null) {
  if (value === null || value === undefined) return ''
  const stringified = String(value)
  return /[",\n]/.test(stringified) ? `"${stringified.replace(/"/g, '""')}"` : stringified
}

function exportRowsToCsv<T>(rows: T[], columns: Column<T>[], filename: string) {
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

function SortIcon({ active, direction }: { active: boolean; direction: 'asc' | 'desc' }) {
  if (!active) return <ArrowDownWideNarrow size={12} className="ml-1 opacity-40" />
  return direction === 'asc' ? (
    <ArrowUpWideNarrow size={12} className="ml-1" />
  ) : (
    <ArrowDownWideNarrow size={12} className="ml-1" />
  )
}

function FilterDropdown({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: FilterOption[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <select
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="rounded-lg border border-gray-700 bg-[#0B1220] px-3 py-2 text-xs text-gray-300 outline-none"
    >
      <option value="all" className="bg-[#0B1220]">
        {label}: All
      </option>
      {options.map((option) => (
        <option key={option.value} value={option.value} className="bg-[#0B1220]">
          {option.label}
        </option>
      ))}
    </select>
  )
}

function MobileCard<T>({
  row,
  columns,
  onClick,
}: {
  row: T
  columns: Column<T>[]
  onClick?: (row: T) => void
}) {
  return (
    <div
      onClick={() => onClick?.(row)}
      className={`rounded-2xl border border-gray-800 bg-[#0B1220] p-4 ${onClick ? 'cursor-pointer' : ''}`}
    >
      {columns.slice(0, 4).map((column) => (
        <div key={column.key} className="flex items-center justify-between py-1.5">
          <span className="text-[10px] uppercase tracking-[0.15em] text-gray-500">
            {column.label}
          </span>
          <span className="text-sm text-gray-300">{column.render(row)}</span>
        </div>
      ))}
    </div>
  )
}

function Pagination({
  currentPage,
  totalPages,
  onPageChange,
}: {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
}) {
  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1
    if (currentPage <= 3) return i + 1
    if (currentPage >= totalPages - 2) return totalPages - 4 + i
    return currentPage - 2 + i
  })
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
        disabled={currentPage === 1}
        aria-label="Previous page"
        className="rounded-lg border border-gray-700 bg-[#0B1220] p-2 text-gray-400 transition hover:enabled:bg-gray-800 disabled:opacity-30"
      >
        <ChevronLeft size={14} />
      </button>
      {pages.map((page) => (
        <button
          key={page}
          type="button"
          onClick={() => onPageChange(page)}
          className={`h-9 min-w-[36px] rounded-lg text-xs font-medium transition ${
            page === currentPage ? 'bg-indigo-500/15 text-indigo-300' : 'text-gray-400 hover:bg-gray-800'
          }`}
        >
          {page}
        </button>
      ))}
      <button
        type="button"
        onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
        disabled={currentPage === totalPages}
        aria-label="Next page"
        className="rounded-lg border border-gray-700 bg-[#0B1220] p-2 text-gray-400 transition hover:enabled:bg-gray-800 disabled:opacity-30"
      >
        <ChevronRight size={14} />
      </button>
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
              aria-label={searchPlaceholder ?? 'Search'}
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
                      aria-label="Select all rows"
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
                          aria-label={`Select row ${rowId}`}
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
                    aria-label={`Select row ${getRowId(row)}`}
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
