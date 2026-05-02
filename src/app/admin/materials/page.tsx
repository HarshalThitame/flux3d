'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Beaker, ArrowLeft, X, Check, AlertTriangle } from 'lucide-react'
import type { QuoteMaterial } from '@/lib/quote/types'

export default function AdminMaterialsPage() {
  const [materials, setMaterials] = useState<QuoteMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<QuoteMaterial | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [recommendedFor, setRecommendedFor] = useState<string[]>([''])
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null)

  useEffect(() => {
    if (!toast) return
    const timer = setTimeout(() => setToast(null), 3000)
    return () => clearTimeout(timer)
  }, [toast])
  const [formData, setFormData] = useState({
    name: '',
    icon: '🧩',
    summary: '',
    density: 1.24,
    pricePerGram: 2.8,
    machineRate: 180,
    multiplier: 1.0,
    properties: { strength: 'Medium', flexibility: 'Low', tempResistance: 'Low', difficulty: 'Easy' },
    colors: [{ name: 'Default', hex: '#ffffff' }],
  })

  useEffect(() => {
    fetchMaterials()
  }, [])

  async function fetchMaterials() {
    setLoading(true)
    try {
      const res = await fetch('/api/materials')
      if (res.ok) {
        const data = await res.json()
        setMaterials(data.materials || data)
      }
    } catch {
      // Failed to fetch
    } finally {
      setLoading(false)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const payload = {
      name: formData.name,
      icon: formData.icon,
      summary: formData.summary,
      density: formData.density,
      price_per_gram: formData.pricePerGram,
      machine_rate: formData.machineRate,
      multiplier: formData.multiplier,
      recommended_for: recommendedFor.filter(Boolean).join(', '),
      properties: formData.properties,
      colors: formData.colors,
    }

    try {
      if (editingMaterial) {
        const res = await fetch(`/api/materials/${editingMaterial.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setToast({ type: 'success', message: 'Material updated successfully!' })
          setShowForm(false)
          setEditingMaterial(null)
          resetForm()
          fetchMaterials()
        } else {
          setToast({ type: 'error', message: 'Failed to update material' })
        }
      } else {
        const res = await fetch('/api/materials', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })
        if (res.ok) {
          setToast({ type: 'success', message: 'Material created successfully!' })
          setShowForm(false)
          resetForm()
          fetchMaterials()
        } else {
          setToast({ type: 'error', message: 'Failed to create material' })
        }
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to save material' })
    }
  }

  async function handleDelete(id: string) {
    setDeleteConfirm(id)
  }

  async function confirmDelete() {
    if (!deleteConfirm) return
    try {
      const res = await fetch(`/api/materials/${deleteConfirm}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setToast({ type: 'success', message: 'Material deleted successfully!' })
        setDeleteConfirm(null)
        fetchMaterials()
      } else {
        setToast({ type: 'error', message: 'Failed to delete material' })
      }
    } catch {
      setToast({ type: 'error', message: 'Failed to delete material' })
    }
  }

  function handleEdit(material: QuoteMaterial) {
    setEditingMaterial(material)
    setFormData({
      name: material.name,
      icon: material.icon,
      summary: material.summary,
      density: material.density,
      pricePerGram: material.pricePerGram,
      machineRate: material.machineRate,
      multiplier: material.multiplier,
      properties: material.properties,
      colors: material.colors,
    })
    setRecommendedFor(material.recommendedFor ? material.recommendedFor.split(', ') : [''])
    setShowForm(true)
  }

  function resetForm() {
    setFormData({
      name: '',
      icon: '🧩',
      summary: '',
      density: 1.24,
      pricePerGram: 2.8,
      machineRate: 180,
      multiplier: 1.0,
      properties: { strength: 'Medium', flexibility: 'Low', tempResistance: 'Low', difficulty: 'Easy' },
      colors: [{ name: 'Default', hex: '#ffffff' }],
    })
    setRecommendedFor([''])
  }

  function addColor() {
    setFormData({
      ...formData,
      colors: [...formData.colors, { name: '', hex: '#000000' }],
    })
  }

  function updateColor(index: number, field: 'name' | 'hex', value: string) {
    const updated = [...formData.colors]
    updated[index] = { ...updated[index], [field]: value }
    setFormData({ ...formData, colors: updated })
  }

  function removeColor(index: number) {
    setFormData({ ...formData, colors: formData.colors.filter((_, i) => i !== index) })
  }

  function addRecommendedFor() {
    setRecommendedFor([...recommendedFor, ''])
  }

  function updateRecommendedFor(index: number, value: string) {
    const updated = [...recommendedFor]
    updated[index] = value
    setRecommendedFor(updated)
  }

  function removeRecommendedFor(index: number) {
    setRecommendedFor(recommendedFor.filter((_, i) => i !== index))
  }

  return (
    <div className="min-h-screen bg-[#050810] text-[#e8eaf0]">
      <div className="px-4 py-8 md:px-8">
        <div className="mx-auto max-w-[1500px]">
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-8"
          >
            <Link
              href="/admin"
              className="inline-flex items-center gap-2 text-sm text-[#7a82a0] hover:text-white mb-4"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to Dashboard
            </Link>
            <div className="flex items-center justify-between">
              <div>
                <h1 className="font-[var(--font-syne)] text-3xl font-bold text-white">
                  <Beaker className="inline h-8 w-8 text-[#FF5C1A] mr-2" />
                  Materials Management
                </h1>
                <p className="mt-2 text-sm text-[#7a82a0]">
                  Manage printing materials, pricing, and properties
                </p>
              </div>
              <button
                onClick={() => {
                  setEditingMaterial(null)
                  resetForm()
                  setShowForm(true)
                }}
                className="inline-flex items-center gap-2 rounded-xl bg-[#FF5C1A] px-4 py-2.5 text-sm font-semibold text-white hover:opacity-90"
              >
                <Plus className="h-4 w-4" />
                Add Material
              </button>
            </div>
          </motion.div>

          {/* Form Modal */}
          {showForm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="mx-4 w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl border border-white/10 bg-[#0d1120] p-6"
              >
                <h2 className="mb-4 text-xl font-bold text-white">
                  {editingMaterial ? 'Edit Material' : 'Add New Material'}
                </h2>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm text-[#7a82a0]">Name</label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-[#7a82a0]">Icon (Emoji)</label>
                      <input
                        type="text"
                        value={formData.icon}
                        onChange={(e) => setFormData({ ...formData, icon: e.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-[#7a82a0]">Density (g/cm³)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.density}
                        onChange={(e) => setFormData({ ...formData, density: parseFloat(e.target.value) })}
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-[#7a82a0]">Price per Gram (₹)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.pricePerGram}
                        onChange={(e) => setFormData({ ...formData, pricePerGram: parseFloat(e.target.value) })}
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-[#7a82a0]">Machine Rate (₹/hr)</label>
                      <input
                        type="number"
                        value={formData.machineRate}
                        onChange={(e) => setFormData({ ...formData, machineRate: parseFloat(e.target.value) })}
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-[#7a82a0]">Multiplier</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.multiplier}
                        onChange={(e) => setFormData({ ...formData, multiplier: parseFloat(e.target.value) })}
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="mb-1 block text-sm text-[#7a82a0]">Summary</label>
                    <textarea
                      value={formData.summary}
                      onChange={(e) => setFormData({ ...formData, summary: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      rows={2}
                    />
                  </div>

                  {/* Dynamic Colors */}
                  <div>
                    <label className="mb-1 block text-sm text-[#7a82a0]">Colors (name + hex)</label>
                    {formData.colors.map((color, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={color.name}
                          onChange={(e) => updateColor(index, 'name', e.target.value)}
                          placeholder="Color name"
                          className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                        />
                        <input
                          type="color"
                          value={color.hex}
                          onChange={(e) => updateColor(index, 'hex', e.target.value)}
                          className="h-10 w-14 cursor-pointer rounded-lg border border-white/10 bg-white/[0.03]"
                        />
                        <input
                          type="text"
                          value={color.hex}
                          onChange={(e) => updateColor(index, 'hex', e.target.value)}
                          className="w-24 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                        />
                        {formData.colors.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeColor(index)}
                            className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-2 text-rose-400 hover:bg-rose-400/20"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addColor}
                      className="text-sm text-[#FF5C1A] hover:text-[#FF9A72]"
                    >
                      + Add another color
                    </button>
                  </div>

                  {/* Dynamic Recommended For */}
                  <div>
                    <label className="mb-1 block text-sm text-[#7a82a0]">Recommended For (multiple options)</label>
                    {recommendedFor.map((item, index) => (
                      <div key={index} className="flex gap-2 mb-2">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => updateRecommendedFor(index, e.target.value)}
                          placeholder="e.g., Concept models, Prototypes"
                          className="flex-1 rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                        />
                        {recommendedFor.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeRecommendedFor(index)}
                            className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-2 text-rose-400 hover:bg-rose-400/20"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addRecommendedFor}
                      className="text-sm text-[#FF5C1A] hover:text-[#FF9A72]"
                    >
                      + Add another recommendation
                    </button>
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button
                      type="submit"
                      className="flex-1 rounded-xl bg-[#FF5C1A] py-2.5 text-sm font-semibold text-white hover:opacity-90"
                    >
                      {editingMaterial ? 'Update' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowForm(false)
                        setEditingMaterial(null)
                        resetForm()
                      }}
                      className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm font-medium text-white hover:bg-white/[0.07]"
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </motion.div>
            </motion.div>
          )}

          {/* Materials List */}
          {loading ? (
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1e] p-8 text-center text-sm text-[#7a82a0]">
              Loading materials...
            </div>
          ) : materials.length === 0 ? (
            <div className="rounded-2xl border border-white/10 bg-[#0a0f1e] p-8 text-center">
              <Beaker className="mx-auto h-12 w-12 text-[#7a82a0]" />
              <p className="mt-4 text-sm text-[#7a82a0]">No materials yet. Add your first material!</p>
            </div>
          ) : (
            <div className="grid gap-4">
              {materials.map((material, i) => (
                <motion.div
                  key={material.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-white/10 bg-[#0a0f1e] p-5 hover:border-[#FF5C1A]/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-start gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[#FF5C1A]/10 text-2xl">
                        {material.icon}
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">{material.name}</h3>
                        <p className="mt-1 text-sm text-[#7a82a0]">{material.summary}</p>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-[#7a82a0]">
                          <span>₹{material.pricePerGram}/g</span>
                          <span>×{material.multiplier}</span>
                          <span>{material.density} g/cm³</span>
                        </div>
                        {material.recommendedFor && (
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {material.recommendedFor.split(', ').map((item, idx) => (
                              <span key={idx} className="rounded-full bg-white/[0.05] px-2 py-0.5 text-[11px] text-[#7a82a0]">
                                {item}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(material)}
                        className="rounded-lg border border-[#7dd3fc]/20 bg-[#7dd3fc]/10 p-2 text-[#7dd3fc] hover:bg-[#7dd3fc]/20"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(material.id)}
                        className="rounded-lg border border-rose-400/20 bg-rose-400/10 p-2 text-rose-400 hover:bg-rose-400/20"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
          {/* Delete Confirmation Modal */}
          {deleteConfirm && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.95, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="mx-4 w-full max-w-md rounded-2xl border border-rose-400/20 bg-[#0d1120] p-6"
              >
                <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-400/10">
                  <Trash2 className="h-6 w-6 text-rose-400" />
                </div>
                <h3 className="text-lg font-semibold text-white">Delete Material?</h3>
                <p className="mt-2 text-sm text-[#7a82a0]">
                  This action cannot be undone. This will permanently delete the material and remove it from the system.
                </p>
                <div className="mt-6 flex gap-3">
                  <button
                    onClick={() => setDeleteConfirm(null)}
                    className="flex-1 rounded-xl border border-white/10 bg-white/[0.03] py-2.5 text-sm font-medium text-white hover:bg-white/[0.07]"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={confirmDelete}
                    className="flex-1 rounded-xl bg-rose-500 py-2.5 text-sm font-semibold text-white hover:bg-rose-600"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
          {/* Toast Message */}
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className={`fixed top-4 right-4 z-50 flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium shadow-lg ${
                toast.type === 'success' 
                  ? 'bg-emerald-500/90 text-white' 
                  : 'bg-rose-500/90 text-white'
              }`}
            >
              {toast.type === 'success' ? (
                <Check className="h-4 w-4" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              {toast.message}
            </motion.div>
          )}

        </div>
      </div>
    </div>
  )
}
