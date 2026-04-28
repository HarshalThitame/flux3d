'use client'

import { useEffect, useState } from 'react'
import { Plus } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
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
      colors: form.colors
        .split(',')
        .map((color) => color.trim())
        .filter(Boolean),
      stock: form.stock,
    }

    setSaving(true)

    try {
      const response = await fetch('/api/admin/materials', {
        method: activeMaterial ? 'PATCH' : 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
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
    return <div className="rounded-[28px] border border-rose-400/15 bg-rose-400/10 p-6 text-rose-100">{error}</div>
  }

  if (materials === null) {
    return <SkeletonBlock className="h-[420px] w-full" />
  }

  if (materials.length === 0) {
    return (
      <>
        <div className="rounded-[28px] border border-dashed border-white/10 bg-white/[0.025] p-10 text-center">
          <div className="text-xl font-semibold text-white">No materials configured</div>
          <p className="mx-auto mt-3 max-w-lg text-sm leading-7 text-[#9aa3c3]">
            Add material records to start managing your print catalog here.
          </p>
          <button
            type="button"
            onClick={openCreateModal}
            className="mt-6 inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-[#0a1122]"
          >
            <Plus className="h-4 w-4" />
            Add Material
          </button>
        </div>

        <Modal
          open={open}
          onOpenChange={setOpen}
          title="Add Material"
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
              value={form.pricePerGram}
              onChange={(value) => setForm((current) => ({ ...current, pricePerGram: value }))}
              placeholder="3.1"
            />
            <InputField
              label="Density"
              value={form.density}
              onChange={(value) => setForm((current) => ({ ...current, density: value }))}
              placeholder="1.24"
            />
            <SelectField
              label="Stock state"
              value={form.stock}
              onChange={(value) =>
                setForm((current) => ({ ...current, stock: value as AdminMaterial['stock'] }))
              }
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
          <div className="mt-6 flex justify-end">
            <button
              type="button"
              onClick={handleSaveMaterial}
              disabled={saving}
              className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-[#091120]"
            >
              {saving ? 'Saving...' : 'Save Material'}
            </button>
          </div>
        </Modal>
        <AdminToast toast={toast} />
      </>
    )
  }

  return (
    <>
      <div className="space-y-6">
        <section className="flex flex-col gap-5 rounded-[32px] border border-white/10 bg-[rgba(10,16,31,0.94)] p-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <h1 className="font-[var(--font-syne)] text-4xl font-extrabold text-white">Materials</h1>
            <p className="mt-3 max-w-2xl text-base leading-8 text-[#9ca7c6]">
              Manage print materials, pricing, densities, and color variants from one consistent catalog.
            </p>
          </div>
          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex items-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-medium text-[#091120]"
          >
            <Plus className="h-4 w-4" />
            Add Material
          </button>
        </section>

        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {materials.map((material) => (
            <button
              key={material.id}
              type="button"
              onClick={() => openEditModal(material)}
              className="rounded-[28px] border border-white/10 bg-[rgba(10,16,31,0.94)] p-6 text-left shadow-[0_18px_60px_rgba(0,0,0,0.18)] transition hover:border-white/18"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="font-[var(--font-syne)] text-2xl font-bold text-white">{material.name}</div>
                  <div className="mt-2 text-sm text-[#96a2c3]">Density {material.density} g/cm3</div>
                </div>
                <StatusBadge status={material.stock} />
              </div>
              <div className="mt-5 rounded-[20px] border border-white/8 bg-white/[0.03] p-4">
                <div className="text-xs uppercase tracking-[0.18em] text-[#7f8aac]">Price per gram</div>
                <div className="mt-2 text-2xl font-semibold text-white">₹{material.price_per_gram}</div>
              </div>
              <div className="mt-5 flex flex-wrap gap-2">
                {material.colors.map((color) => (
                  <span key={color} className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-[#d7def1]">
                    {color}
                  </span>
                ))}
              </div>
            </button>
          ))}
        </div>
      </div>

      <Modal
        open={open}
        onOpenChange={setOpen}
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
            value={form.pricePerGram}
            onChange={(value) => setForm((current) => ({ ...current, pricePerGram: value }))}
            placeholder="3.1"
          />
          <InputField
            label="Density"
            value={form.density}
            onChange={(value) => setForm((current) => ({ ...current, density: value }))}
            placeholder="1.24"
          />
          <SelectField
            label="Stock state"
            value={form.stock}
            onChange={(value) =>
              setForm((current) => ({ ...current, stock: value as AdminMaterial['stock'] }))
            }
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
        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={handleSaveMaterial}
            disabled={saving}
            className="rounded-2xl bg-white px-5 py-3 text-sm font-medium text-[#091120]"
          >
            {saving ? 'Saving...' : 'Save Material'}
          </button>
        </div>
      </Modal>
      <AdminToast toast={toast} />
    </>
  )
}
