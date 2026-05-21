'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Package, Search, Plus } from 'lucide-react'
import DataTable from '@/components/admin/DataTable'
import type { AdminMaterial } from '@/lib/admin/types'
import SkeletonBlock from '@/components/admin/SkeletonBlock'

export default function ProductsPage() {
  const [materials, setMaterials] = useState<AdminMaterial[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch('/api/admin/inventory', { signal: controller.signal })
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load products.')
        }

        const json = (await response.json()) as { materials: AdminMaterial[] }
        setMaterials(json.materials)
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load products.')
      }
    }

    void load()
    return () => controller.abort()
  }, [])

  if (error) {
    return <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-sm text-rose-600">{error}</div>
  }

  if (!materials) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-8 w-48" />
        <SkeletonBlock className="h-5 w-96 max-w-full" />
        <SkeletonBlock className="h-[420px] w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#6d28d9]/20 bg-[#6d28d9]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#6d28d9]">
          <Package className="h-3 w-3" />
          Product Catalog
        </div>
        <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-[#0F1B3D]">Products / Catalog</h1>
        <p className="mt-2 max-w-xl text-sm text-[#6F7192]">
          Manage your product catalog and pricing
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <DataTable
          title="Products"
          description="Manage products and catalog items"
          data={materials}
          searchPlaceholder="Search products..."
          searchKeys={['name']}
          columns={[
            { key: 'name', label: 'Product Name', sortable: true, render: (row: AdminMaterial) => <span className="font-medium text-[#0F1B3D]">{row.name}</span> },
            { key: 'price_per_gram', label: 'Price/Gram', sortable: true, render: (row: AdminMaterial) => <span className="font-medium text-[#0F1B3D]">₹{row.price_per_gram}</span> },
            { key: 'density', label: 'Density', sortable: true, render: (row: AdminMaterial) => <span className="text-[#6F7192]">{row.density}</span> },
            { key: 'colors', label: 'Colors', render: (row: AdminMaterial) => (
              <div className="flex flex-wrap gap-1">
                {row.colors.map((color, i) => (
                  <span key={i} className="rounded-md border border-gray-200 bg-gray-50 px-1.5 py-0.5 text-[10px] text-[#6F7192]">
                    {typeof color === 'string' ? color : (color as {name?: string}).name ?? JSON.stringify(color)}
                  </span>
                ))}
              </div>
            )},
            { key: 'stock', label: 'Status', sortable: true, render: (row: AdminMaterial) => (
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                row.stock === 'Healthy' ? 'bg-emerald-100 text-emerald-700' :
                row.stock === 'Low' ? 'bg-yellow-100 text-yellow-700' :
                'bg-gray-100 text-gray-700'
              }`}>
                {row.stock}
              </span>
            )},
            { key: 'action', label: 'Action', render: () => (
              <button className="text-[#6d28d9] hover:text-[#6d28d9] text-sm">Edit</button>
            )},
          ]}
        />
      </motion.div>
    </div>
  )
}
