'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Beaker, ArrowLeft, X, Check, AlertTriangle } from 'lucide-react'
import type { QuoteMaterial } from '@/lib/quote/types'

// Color name to hex mapping
const colorNameToHex = (input: string): string => {
  const colorMap: Record<string, string> = {
    'red': '#EF4444', 'green': '#22C55E', 'blue': '#3B82F6', 'yellow': '#EAB308',
    'orange': '#FF5C1A', 'purple': '#A855F7', 'pink': '#EC4899', 'white': '#FFFFFF',
    'black': '#000000', 'gray': '#6B7280', 'grey': '#6B7280', 'cyan': '#06B6D4',
    'teal': '#14B8A6', 'lime': '#84CC16', 'indigo': '#6366F1', 'violet': '#8B5CF6',
    'fuchsia': '#D946EF', 'rose': '#F43F5E', 'sky': '#0EA5E9', 'magenta': '#D946EF',
    'brown': '#92400E', 'navy': '#1E3A5F', 'maroon': '#7F1D1D', 'olive': '#3F6212',
    'coral': '#F97316', 'salmon': '#FB923C', 'gold': '#F59E0B', 'silver': '#9CA3AF',
  };
  const trimmed = input.trim().toLowerCase();
  if (trimmed.startsWith('#') && /^#[0-9a-f]{3,8}$/i.test(trimmed)) return trimmed;
  return colorMap[trimmed] || trimmed;
};

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
    difficultyFactor: 1.1,
    properties: { strength: 'Medium', flexibility: 'Low', tempResistance: 'Low', difficulty: 'Easy' },
    colors: ['#ffffff'],
    keyProperties: [] as string[],
    bestFor: [] as string[],
    difficultyLevel: 'Easy' as 'Easy' | 'Medium' | 'Hard',
    heatResistance: 'Low' as 'Low' | 'Medium' | 'High',
    strengthRating: 'Medium' as 'Low' | 'Medium' | 'High',
    finishQuality: 'Good' as 'Basic' | 'Good' | 'Excellent',
    samplePhoto: '',
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
      difficulty_factor: formData.difficultyFactor,
      recommended_for: recommendedFor.filter(Boolean).join(', '),
      properties: formData.properties,
      colors: formData.colors.map(c => ({ name: c, hex: colorNameToHex(c) })),
      key_properties: formData.keyProperties,
      best_for: formData.bestFor,
      difficulty_level: formData.difficultyLevel,
      heat_resistance: formData.heatResistance,
      strength_rating: formData.strengthRating,
      finish_quality: formData.finishQuality,
      sample_photo: formData.samplePhoto,
    }

    try {
      if (editingMaterial) {
        const res = await fetch(`/api/materials`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ ...payload, id: editingMaterial.id }),
        })
        if (res.ok) {
          setToast({ type: 'success', message: 'Material updated successfully!' })
          setShowForm(false)
          setEditingMaterial(null)
          resetForm()
          fetchMaterials()
        } else {
          const result = await res.json()
          setToast({ type: 'error', message: result.error || 'Failed to update material' })
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
          const result = await res.json()
          setToast({ type: 'error', message: result.error || 'Failed to create material' })
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
      const res = await fetch(`/api/materials?id=${deleteConfirm}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setToast({ type: 'success', message: 'Material deleted successfully!' })
        setDeleteConfirm(null)
        fetchMaterials()
      } else {
        const result = await res.json()
        setToast({ type: 'error', message: result.error || 'Failed to delete material' })
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
      difficultyFactor: material.difficultyFactor,
      properties: material.properties,
      colors: (material.colors || []).map(c => typeof c === 'string' ? c : c.name || '#ffffff'),
      keyProperties: material.keyProperties || [],
      bestFor: material.bestFor || [],
      difficultyLevel: material.difficultyLevel || 'Easy',
      heatResistance: material.heatResistance || 'Low',
      strengthRating: material.strengthRating || 'Medium',
      finishQuality: material.finishQuality || 'Good',
      samplePhoto: material.samplePhoto || '',
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
      difficultyFactor: 1.1,
      properties: { strength: 'Medium', flexibility: 'Low', tempResistance: 'Low', difficulty: 'Easy' },
      colors: ['#ffffff'],
      keyProperties: [],
      bestFor: [],
      difficultyLevel: 'Easy',
      heatResistance: 'Low',
      strengthRating: 'Medium',
      finishQuality: 'Good',
      samplePhoto: '',
    })
    setRecommendedFor([''])
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
                    <div>
                      <label className="mb-1 block text-sm text-[#7a82a0]">Difficulty Factor (Sanding)</label>
                      <select
                        value={formData.difficultyFactor}
                        onChange={(e) => setFormData({ ...formData, difficultyFactor: parseFloat(e.target.value) })}
                        className="w-full rounded-lg border border-white/10 bg-[#0d1120] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      >
                        <option value={1.1}>1.1X</option>
                        <option value={1.2}>1.2X</option>
                        <option value={1.3}>1.3X</option>
                        <option value={1.5}>1.5X</option>
                        <option value={10}>10X</option>
                      </select>
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

                  {/* New Material Properties */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-sm text-[#7a82a0]">Key Properties (comma-separated)</label>
                      <input
                        type="text"
                        value={formData.keyProperties?.join(', ') || ''}
                        onChange={(e) => setFormData({ ...formData, keyProperties: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        placeholder="e.g., Biodegradable, Easy to print"
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-[#7a82a0]">Best For (comma-separated)</label>
                      <input
                        type="text"
                        value={formData.bestFor?.join(', ') || ''}
                        onChange={(e) => setFormData({ ...formData, bestFor: e.target.value.split(',').map(s => s.trim()).filter(Boolean) })}
                        placeholder="e.g., Students, Architects, Hobbyists"
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-[#7a82a0]">Difficulty Level</label>
                      <select
                        value={formData.difficultyLevel || 'Easy'}
                        onChange={(e) => setFormData({ ...formData, difficultyLevel: e.target.value as 'Easy' | 'Medium' | 'Hard' })}
                        className="w-full rounded-lg border border-white/10 bg-[#0d1120] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      >
                        <option value="Easy">Easy</option>
                        <option value="Medium">Medium</option>
                        <option value="Hard">Hard</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-[#7a82a0]">Heat Resistance</label>
                      <select
                        value={formData.heatResistance || 'Low'}
                        onChange={(e) => setFormData({ ...formData, heatResistance: e.target.value as 'Low' | 'Medium' | 'High' })}
                        className="w-full rounded-lg border border-white/10 bg-[#0d1120] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-[#7a82a0]">Strength Rating</label>
                      <select
                        value={formData.strengthRating || 'Medium'}
                        onChange={(e) => setFormData({ ...formData, strengthRating: e.target.value as 'Low' | 'Medium' | 'High' })}
                        className="w-full rounded-lg border border-white/10 bg-[#0d1120] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                      </select>
                    </div>
                    <div>
                      <label className="mb-1 block text-sm text-[#7a82a0]">Finish Quality</label>
                      <select
                        value={formData.finishQuality || 'Good'}
                        onChange={(e) => setFormData({ ...formData, finishQuality: e.target.value as 'Basic' | 'Good' | 'Excellent' })}
                        className="w-full rounded-lg border border-white/10 bg-[#0d1120] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      >
                        <option value="Basic">Basic</option>
                        <option value="Good">Good</option>
                        <option value="Excellent">Excellent</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-sm text-[#7a82a0]">Sample Photo URL</label>
                    <input
                      type="text"
                      value={formData.samplePhoto || ''}
                      onChange={(e) => setFormData({ ...formData, samplePhoto: e.target.value })}
                      placeholder="https://... or upload below"
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                    />
                  </div>

                  {/* Colors */}
                  <div>
                    <label className="mb-1 block text-sm text-[#7a82a0]">Colors (comma-separated color names or hex codes)</label>
                    <input
                      type="text"
                      value={formData.colors.join(', ')}
                      onChange={(e) => setFormData({ ...formData, colors: e.target.value.split(',').map(c => c.trim()).filter(Boolean) })}
                      placeholder="red, blue, green, #FF5C1A"
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                    />
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
            <div className="space-y-4">
              {materials.map((material, i) => (
                <motion.div
                  key={material.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  className="rounded-2xl border border-white/10 bg-[#0a0f1e] p-5 hover:border-[#FF5C1A]/30 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-2xl">{material.icon}</span>
                        <h3 className="text-lg font-semibold text-white">{material.name}</h3>
                      </div>
                      <p className="mt-1 text-sm text-[#7a82a0]">{material.summary}</p>
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-[#7a82a0]">
                        <span>₹{material.pricePerGram}/g</span>
                        <span>₹{material.machineRate}/hr</span>
                        <span>Density: {material.density} g/cm³</span>
                        <span>Multiplier: {material.multiplier}x</span>
                      </div>
                      {material.keyProperties && material.keyProperties.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {material.keyProperties.map((prop, idx) => (
                            <span key={idx} className="rounded-full bg-[#FF5C1A]/10 px-2 py-1 text-xs text-[#FF5C1A]">
                              {prop}
                            </span>
                          ))}
                        </div>
                      )}
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
                  This action cannot be undone. This will permanently delete the material.
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
