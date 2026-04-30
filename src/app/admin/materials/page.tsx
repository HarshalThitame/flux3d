'use client'

import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Box, Plus } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import EmptyState from '@/components/admin/EmptyState'
import Modal from '@/components/admin/Modal'
import SkeletonBlock from '@/components/admin/SkeletonBlock'
import StatusBadge from '@/components/admin/StatusBadge'
import { InputField, SelectField } from '@/components/admin/FormField'
import type { AdminMaterial } from '@/lib/admin/types'

type MaterialFormState = {
  name: string
  pricePerGram: string
  density: string
  colors: string
  stock: AdminMaterial['stock']
}

const emptyForm: MaterialFormState = {
  name: '',
  pricePerGram: '',
  density: '',
  colors: '',
  stock: 'Healthy',
}

export default function AdminMaterialsPage() {
  const [materials, setMaterials] = useState<AdminMaterial[] | null>(null)
  const [activeMaterial, setActiveMaterial] = useState<AdminMaterial | null>(null)
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<AdminToastState>(null)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState<MaterialFormState>(emptyForm)

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      try {
        const response = await fetch('/api/admin/materials', { signal: controller.signal })
        if (!response.ok) {
          const body = (await response.json().catch(() => ({}))) as { error?: string }
          throw new Error(body.error ?? 'Failed to load materials.')
        }

        const json = (await response.json()) as { materials: AdminMaterial[] }
        setMaterials(json.materials)
      } catch (loadError) {
        if ((loadError as Error).name === 'AbortError') return
        setError(loadError instanceof Error ? loadError.message : 'Failed to load materials.')
      }
    }

    void load()
    return () => controller.abort()
  }, [])

  useEffect(() => {
    if (!toast) return
    const timer = window.setTimeout(() => setToast(null), 2600)
    return () => window.clearTimeout(timer)
  }, [toast])

  function openCreateModal() {
    setActiveMaterial(null)
    setForm(emptyForm)
    setOpen(true)
  }

  function openEditModal(material: AdminMaterial) {
    setActiveMaterial(material)
    setForm({
      name: material.name,
      pricePerGram: String(material.price_per_gram),
      density: String(material.density),
      colors: material.colors.join(', '),
      stock: material.stock,
    })
    setOpen(true)
  }

  async function handleSaveMaterial() {
    const payload = {
      ...(activeMaterial ? { id: activeMaterial.id } : {}),
      name: form.name.trim(),
      pricePerGram: Number(form.pricePerGram),
      density: Number(form.density),
      colors: form.colors.split(',').map((color) => color.trim()).filter(Boolean),
      stock: form.stock,
    }

    setSaving(true)

    try {
      const response = await fetch('/api/admin/materials', {
        method: activeMaterial ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as { error?: string }
        throw new Error(body.error ?? 'Failed to save material.')
      }

      const json = (await response.json()) as { material: AdminMaterial }

      setMaterials((current) => {
        if (!current) return [json.material]
        if (activeMaterial) {
          return current.map((item) => (item.id === json.material.id ? json.material : item))
        }
        return [json.material, ...current]
      })
      setOpen(false)
      setActiveMaterial(null)
      setForm(emptyForm)
      setToast({
        type: 'success',
        message: activeMaterial ? 'Material updated successfully.' : 'Material created successfully.',
      })
    } catch (saveError) {
      setToast({
        type: 'error',
        message: saveError instanceof Error ? saveError.message : 'Failed to save material.',
      })
    } finally {
      setSaving(false)
    }
  }

  if (error) {
    return <div className="rounded-xl border border-rose-400/20 bg-rose-400/10 p-5 text-sm text-rose-300">{error}</div>
  }

  if (materials === null) {
    return (
      <div className="space-y-6">
        <div className="flex items-end justify-between">
          <div className="space-y-3">
            <SkeletonBlock className="h-8 w-48" />
            <SkeletonBlock className="h-5 w-72 max-w-full" />
          </div>
          <SkeletonBlock className="h-10 w-32" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <SkeletonBlock key={i} className="h-48 w-full" />
          ))}
        </div>
      </div>
    )
  }

  if (materials.length === 0) {
    return (
      <EmptyState
        title="No materials configured"
        description="Add material records to start managing your print catalog."
        ctaLabel="Add Material"
        ctaHref="#"
      />
    )
  }

  return (
    <>
      <div className="space-y-6">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-end justify-between">
          <div>
            <div className="mb-1 inline-flex items-center gap-2 rounded-full border border-violet-400/20 bg-violet-400/10 px-3 py-1 text-[10px] uppercase tracking-[0.2em] text-violet-300">
              <Box className="h-3 w-3" />
              Material Catalog
            </div>
            <h1 className="mt-2 font-[var(--font-syne)] text-3xl font-bold tracking-tight text-white">Materials</h1>
            <p className="mt-2 max-w-xl text-sm text-[#7a82a0]">
              Manage print materials, pricing, densities, and color variants.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-xl bg-[#FF5C1A] px-4 py-2.5 text-sm font-medium text-white transition-opacity hover:opacity-90"
          >
            <Plus className="h-4 w-4" />
            Add Material
          </button>
        </motion.div>

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {materials.map((material, i) => (
            <motion.button
              key={material.id}
              type="button"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => openEditModal(material)}
              className="rounded-2xl border border-white/[0.06] bg-[#0a0f1e] p-5 text-left transition hover:border-white/10"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="text-base font-semibold text-white">{material.name}</div>
                  <div className="mt-1 text-xs text-[#7a82a0]">Density {material.density} g/cm³</div>
                </div>
                <StatusBadge status={material.stock} />
              </div>
              <div className="mt-4 rounded-xl border border-white/[0.04] bg-white/[0.02] px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-[0.15em] text-[#5a6580]">Price per gram</div>
                <div className="mt-1 text-lg font-semibold text-white">₹{material.price_per_gram}</div>
              </div>
              <div className="mt-4 flex flex-wrap gap-1.5">
                {material.colors.map((color) => (
                  <span key={color} className="rounded-full border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 text-[10px] text-[#8b95b5]">
                    {color}
                  </span>
                ))}
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <Modal
        open={open}
        onOpenChangeAction={setOpen}
        title={activeMaterial ? `Edit ${activeMaterial.name}` : 'Add Material'}
        description="Update catalog pricing, density, color availability, and stock state."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <InputField
            label="Material Name"
            value={form.name}
            onChange={(value) => setForm((current) => ({ ...current, name: value }))}
            placeholder="PLA Pro"
          />
          <InputField
            label="Price per gram"
            type="number"
            value={form.pricePerGram}
            onChange={(value) => setForm((current) => ({ ...current, pricePerGram: value }))}
            placeholder="3.1"
          />
          <InputField
            label="Density"
            type="number"
            value={form.density}
            onChange={(value) => setForm((current) => ({ ...current, density: value }))}
            placeholder="1.24"
          />
          <SelectField
            label="Stock state"
            value={form.stock}
            onChange={(value) => setForm((current) => ({ ...current, stock: value as AdminMaterial['stock'] }))}
            options={[
              { label: 'Healthy', value: 'Healthy' },
              { label: 'Low', value: 'Low' },
              { label: 'Paused', value: 'Paused' },
            ]}
          />
          <div className="md:col-span-2">
            <InputField
              label="Colors"
              value={form.colors}
              onChange={(value) => setForm((current) => ({ ...current, colors: value }))}
              placeholder="Graphite, Arctic White, Neon Coral"
            />
          </div>
        </div>
        <div className="mt-5 flex justify-end gap-3">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-white/8 bg-white/[0.03] px-4 py-2.5 text-sm text-[#8b95b5] transition hover:bg-white/[0.06]"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveMaterial}
            disabled={saving}
            className="rounded-xl bg-[#FF5C1A] px-4 py-2.5 text-sm font-medium text-white transition-opacity disabled:opacity-50 hover:enabled:opacity-90"
          >
            {saving ? 'Saving...' : 'Save Material'}
          </button>
        </div>
      </Modal>
      <AdminToast toast={toast} />
    </>
  )
}
