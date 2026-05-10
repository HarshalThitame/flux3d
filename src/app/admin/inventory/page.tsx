'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { FolderKanban, Download } from 'lucide-react'
import DataTable from '@/components/admin/DataTable'
import type { AdminMaterial } from '@/lib/admin/types'
import SkeletonBlock from '@/components/admin/SkeletonBlock'

export default function InventoryPage() {
  const router = useRouter()
  const [materials, setMaterials] = useState<AdminMaterial[] | null>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch('/api/admin/inventory', { signal: controller.signal })
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load inventory data.')
        }

        const json = (await response.json()) as { materials: AdminMaterial[] }
        setMaterials(json.materials)
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load inventory data.')
      }
    }

    void load()
    return () => controller.abort()
  }, [])

  const lowStockMaterials = materials?.filter(
    (m) => m.stock === 'Low' || m.stock === 'Paused'
  ) ?? []

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-400/15 bg-rose-400/10 p-6 text-rose-100">
        {error}
      </div>
    )
  }

  if (!materials) {
    return (
      <div className="space-y-6">
        <SkeletonBlock className="h-32 w-full" />
        <SkeletonBlock className="h-96 w-full" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
        <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-[#7C5CFF]/20 bg-[#7C5CFF]/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-[#7C5CFF]">
          <FolderKanban className="h-3 w-3" />
          Inventory Management
        </div>
        <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-white">Inventory</h1>
        <p className="mt-2 max-w-xl text-sm text-[#6F7192]">
          Manage filaments, resins, and other materials
        </p>
      </motion.div>

      {lowStockMaterials.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-[28px] border border-yellow-400/20 bg-yellow-400/10 p-4"
        >
          <div className="flex items-center gap-2 text-yellow-300">
            <span className="text-sm font-semibold">Warning: {lowStockMaterials.length} materials are below minimum stock threshold. Update stock status to avoid print delays.</span>
          </div>
        </motion.div>
      )}

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="font-[var(--font-syne)] text-xl font-bold text-white">Inventory Status</h2>
            <p className="mt-1 text-sm text-[#6F7192]">Manage filaments, resins, and other materials</p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => router.push('/admin/materials')}
              className="rounded-xl bg-[#7C5CFF] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#7C5CFF]/90"
            >
              Edit Materials
            </button>
            <button className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-2 text-sm font-medium text-[#c6cee5] transition hover:bg-white/[0.06]">
              <Download className="mr-2 inline h-4 w-4" />
              Export Inventory
            </button>
          </div>
        </div>

        <DataTable
          title=""
          description=""
          data={materials}
          searchPlaceholder="Search material name..."
          searchKeys={['name']}
          filters={[
            {
              key: 'stock',
              label: 'Status',
              options: [
                { label: 'All', value: 'all' },
                { label: 'Healthy', value: 'Healthy' },
                { label: 'Low', value: 'Low' },
                { label: 'Paused', value: 'Paused' },
              ],
              getValue: (row) => row.stock,
            },
          ]}
          columns={[
            { key: 'name', label: 'Material', sortable: true, render: (row: AdminMaterial) => <span className="text-white">{row.name}</span> },
            { key: 'price_per_gram', label: 'Price/Gram', sortable: true, render: (row: AdminMaterial) => <span className="font-medium text-white">₹{row.price_per_gram}</span> },
            { key: 'density', label: 'Density', sortable: true, render: (row: AdminMaterial) => <span className="text-[#c6cee5]">{row.density}</span> },
            { key: 'colors', label: 'Colors', render: (row: AdminMaterial) => (
              <div className="flex flex-wrap gap-1">
                {row.colors.map((color, i) => (
                  <span key={i} className="rounded-md border border-white/[0.06] bg-white/[0.03] px-1.5 py-0.5 text-[10px] text-[#8b95b5]">
                    {color}
                  </span>
                ))}
              </div>
            )},
            { key: 'stock', label: 'Status', sortable: true, render: (row: AdminMaterial) => (
              <span className={`rounded-full px-2 py-1 text-[10px] font-semibold ${
                row.stock === 'Healthy' ? 'bg-emerald-400/20 text-emerald-400' :
                row.stock === 'Low' ? 'bg-yellow-400/20 text-yellow-400' :
                'bg-gray-400/20 text-gray-400'
              }`}>
                {row.stock}
              </span>
            )},
            { key: 'action', label: 'Action', render: (row: AdminMaterial) => (
              <button
                type="button"
                onClick={() => router.push('/admin/materials')}
                className="text-[#7C5CFF] hover:text-[#7C5CFF] text-sm"
              >
                Edit
              </button>
            )},
          ]}
        />
      </motion.div>
    </div>
  )
}
