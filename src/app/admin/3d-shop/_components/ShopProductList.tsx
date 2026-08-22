'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Archive, ChevronDown, Copy, Download, Edit3, FileJson, FileSpreadsheet, Loader2, Package, Plus, Search, Upload } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import { ImportModal } from './ImportModal'
import type { ShopCategory, ShopProduct } from '@/lib/shop/admin-types'
import { slugifyShopValue } from '@/lib/shop/admin-types'

const PAGE_SIZE = 20

function stockClasses(status: ShopProduct['stock_status']) {
  if (status === 'All In Stock') return 'bg-emerald-100 text-emerald-700'
  if (status === 'Some Low Stock') return 'bg-yellow-100 text-yellow-700'
  if (status === 'Out of Stock') return 'bg-rose-100 text-rose-700'
  return 'bg-gray-100 text-[#6F7192]'
}

export default function ShopProductList() {
  const [products, setProducts] = useState<ShopProduct[]>([])
  const [categories, setCategories] = useState<ShopCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [categoryId, setCategoryId] = useState('')
  const [status, setStatus] = useState('')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [toast, setToast] = useState<AdminToastState>(null)
  const [exportOpen, setExportOpen] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [importOpen, setImportOpen] = useState(false)

  const loadCategories = useCallback(async () => {
    const response = await fetch('/api/3d-shop/admin/categories')
    const data = (await response.json().catch(() => ({}))) as { categories?: ShopCategory[] }
    setCategories(data.categories ?? [])
  }, [])

  const loadProducts = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      if (categoryId) params.set('category_id', categoryId)
      if (status) params.set('status', status)
      if (search.trim()) params.set('search', search.trim())

      const response = await fetch(`/api/3d-shop/admin/products?${params.toString()}`)
      const data = (await response.json()) as { products?: ShopProduct[]; error?: string }
      if (!response.ok) throw new Error(data.error || 'Failed to load products.')
      setProducts(data.products ?? [])
      setPage(1)
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Failed to load products.' })
    } finally {
      setLoading(false)
    }
  }, [categoryId, search, status])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadCategories()
    }, 0)
    return () => window.clearTimeout(timeout)
  }, [loadCategories])

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      void loadProducts()
    }, 250)
    return () => window.clearTimeout(timeout)
  }, [loadProducts])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 3000)
    return () => window.clearTimeout(timer)
  }, [toast])

  async function archiveProduct(product: ShopProduct) {
    if (!window.confirm(`Archive "${product.name}"?`)) return
    const response = await fetch(`/api/3d-shop/admin/products?id=${product.id}`, { method: 'DELETE' })
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok) {
      setToast({ type: 'error', message: data.error || 'Failed to archive product.' })
      return
    }
    setToast({ type: 'success', message: 'Product archived.' })
    await loadProducts()
  }

  async function duplicateProduct(product: ShopProduct) {
    const copyName = `${product.name} Copy`
    const existingSlugs = new Set(products.map((item) => item.slug))
    const slugPrefix = `${slugifyShopValue(copyName)}-${product.id.slice(0, 8)}`
    let slug = slugPrefix
    let suffix = 2
    while (existingSlugs.has(slug)) {
      slug = `${slugPrefix}-${suffix}`
      suffix += 1
    }

    const payload = {
      name: copyName,
      slug,
      description: product.description,
      long_description: product.long_description,
      category_id: product.category_id,
      tags: product.tags ?? [],
      occasion_tags: product.occasion_tags ?? [],
      thumbnail_url: product.thumbnail_url,
      image_urls: product.image_urls ?? [],
      image_alt: product.image_alt ?? {},
      model_url: product.model_url,
      base_price: product.base_price,
      is_customizable: product.is_customizable ?? false,
      customization_label: product.customization_label,
      is_featured: false,
      is_active: false,
      meta_title: product.meta_title,
      meta_description: product.meta_description,
      published_at: null,
    }

    const response = await fetch('/api/3d-shop/admin/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    const data = (await response.json().catch(() => ({}))) as { error?: string }
    if (!response.ok) {
      setToast({ type: 'error', message: data.error || 'Failed to duplicate product.' })
      return
    }
    setToast({ type: 'success', message: 'Draft copy created.' })
    await loadProducts()
  }

  const totalPages = Math.max(Math.ceil(products.length / PAGE_SIZE), 1)
  const visibleProducts = useMemo(() => products.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [page, products])

  async function exportProducts(format: 'csv' | 'json') {
    setExporting(true)
    setExportOpen(false)
    try {
      const params = new URLSearchParams({ format })
      if (categoryId) params.set('category_id', categoryId)
      if (status) params.set('status', status)
      if (search.trim()) params.set('search', search.trim())
      const response = await fetch(`/api/3d-shop/admin/products/export?${params.toString()}`)
      if (!response.ok) {
        const data = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(data.error || 'Export failed.')
      }
      const blob = await response.blob()
      const disposition = response.headers.get('content-disposition') || ''
      const match = disposition.match(/filename="([^"]+)"/)
      const filename = match ? match[1] : `3d-shop-products.${format}`
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = filename
      anchor.click()
      URL.revokeObjectURL(url)
      setToast({ type: 'success', message: `Exported ${format.toUpperCase()} file.` })
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Export failed.' })
    } finally {
      setExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      <AdminToast toast={toast} />
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
            <Package className="h-3 w-3" />
            3D Shop
          </div>
          <h1 className="font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Products</h1>
          <p className="mt-2 max-w-2xl text-sm text-[#6F7192]">Create, price, and manage 3D Shop products.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-[#6d28d9]/20 px-4 py-3 text-sm font-semibold text-[#6d28d9] transition hover:bg-[#6d28d9]/5"
            >
              <Upload className="h-4 w-4" />
              Import
            </button>
          </div>
          <div className="relative">
            <button
              type="button"
              onClick={() => setExportOpen((current) => !current)}
              disabled={exporting}
              className="inline-flex items-center justify-center gap-2 rounded-xl border border-gray-200 px-4 py-3 text-sm font-semibold text-[#0F1B3D] transition hover:bg-gray-50 disabled:opacity-60"
            >
              {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              Export
              <ChevronDown className="h-3.5 w-3.5" />
            </button>
            {exportOpen && (
              <div className="absolute right-0 top-full z-30 mt-1 w-44 overflow-hidden rounded-xl border border-gray-200 bg-white py-1 shadow-lg">
                <button
                  type="button"
                  onClick={() => void exportProducts('csv')}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#0F1B3D] hover:bg-gray-50"
                >
                  <FileSpreadsheet className="h-4 w-4 text-[#6d28d9]" />
                  Export CSV
                </button>
                <button
                  type="button"
                  onClick={() => void exportProducts('json')}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-[#0F1B3D] hover:bg-gray-50"
                >
                  <FileJson className="h-4 w-4 text-[#6d28d9]" />
                  Export JSON
                </button>
              </div>
            )}
          </div>
          <Link
            href="/admin/3d-shop/products/new"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-[#5b21b6]"
          >
            <Plus className="h-4 w-4" />
            Add Product
          </Link>
        </div>
      </motion.div>

      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="grid gap-3 lg:grid-cols-[220px_180px_1fr]">
          <select
            value={categoryId}
            onChange={(event) => setCategoryId(event.target.value)}
            className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none"
          >
            <option value="">All categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
          <select
            value={status}
            onChange={(event) => setStatus(event.target.value)}
            className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none"
          >
            <option value="">Active products</option>
            <option value="active">Active</option>
            <option value="draft">Draft</option>
            <option value="archived">Archived</option>
          </select>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7192]" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by name"
              className="w-full rounded-xl border border-[#6d28d9]/10 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-[#0F1B3D] outline-none"
            />
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-gray-100">
                {['Thumbnail', 'Name', 'Category', 'Base Price', 'SKU Count', 'Stock Status', 'Featured', 'Active', 'Actions'].map((label) => (
                  <th key={label} className="px-4 py-3 text-left text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-[#6F7192]">Loading products...</td>
                </tr>
              ) : visibleProducts.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-5 py-12 text-center text-sm text-[#6F7192]">No products found.</td>
                </tr>
              ) : (
                visibleProducts.map((product) => (
                  <tr key={product.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3">
                      <div className="relative h-10 w-10 overflow-hidden rounded-lg border border-gray-200 bg-gray-50">
                        {product.thumbnail_url ? (
                          <Image src={product.thumbnail_url} alt={product.name} fill sizes="40px" className="object-cover" />
                        ) : (
                          <div className="grid h-full w-full place-items-center text-[10px] text-[#6F7192]">No img</div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#0F1B3D]">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-[#6F7192]">{product.category_name || 'Uncategorized'}</td>
                    <td className="px-4 py-3 text-sm font-semibold text-[#0F1B3D]">₹{Number(product.base_price || 0).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-[#6F7192]">{product.sku_count ?? 0}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${stockClasses(product.stock_status)}`}>
                        {product.stock_status || 'No SKUs'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm text-[#6F7192]">{product.is_featured ? 'Yes' : 'No'}</td>
                    <td className="px-4 py-3 text-sm text-[#6F7192]">{product.is_archived ? 'Archived' : product.is_active ? 'Active' : 'Draft'}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/3d-shop/products/${product.id}/edit`} aria-label={`Edit ${product.name}`} className="rounded-lg border border-gray-200 p-2 text-[#6F7192] hover:bg-gray-50 hover:text-[#0F1B3D]">
                          <Edit3 className="h-4 w-4" />
                        </Link>
                        <button type="button" onClick={() => void duplicateProduct(product)} aria-label={`Duplicate ${product.name}`} className="rounded-lg border border-gray-200 p-2 text-[#6F7192] hover:bg-gray-50 hover:text-[#0F1B3D]">
                          <Copy className="h-4 w-4" />
                        </button>
                        <button type="button" onClick={() => void archiveProduct(product)} aria-label={`Archive ${product.name}`} className="rounded-lg border border-rose-200 p-2 text-rose-600 hover:bg-rose-50">
                          <Archive className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-gray-100 px-4 py-3 text-sm text-[#6F7192]">
            <div>Showing {(page - 1) * PAGE_SIZE + 1}-{Math.min(page * PAGE_SIZE, products.length)} of {products.length}</div>
            <div className="flex items-center gap-2">
              <button type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))} className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40">Previous</button>
              <span>{page} / {totalPages}</span>
              <button type="button" disabled={page === totalPages} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="rounded-lg border border-gray-200 px-3 py-2 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      {exportOpen && <div className="fixed inset-0 z-20" onClick={() => setExportOpen(false)} />}
      <ImportModal open={importOpen} onClose={() => setImportOpen(false)} onImported={() => void loadProducts()} />
    </div>
  )
}
