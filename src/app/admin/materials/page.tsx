'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Plus, Pencil, Trash2, Beaker, ArrowLeft } from 'lucide-react'
import { getSupabaseUrl, getSupabaseServiceRoleKey } from '@/lib/supabase/config'
import { createClient } from '@supabase/supabase-js'
import type { QuoteMaterial } from '@/lib/quote/types'

export default function AdminMaterialsPage() {
  const [materials, setMaterials] = useState<QuoteMaterial[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingMaterial, setEditingMaterial] = useState<QuoteMaterial | null>(null)
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    icon: '🧩',
    summary: '',
    density: 1.24,
    pricePerGram: 2.8,
    machineRate: 180,
    multiplier: 1.0,
    recommendedFor: '',
    properties: { strength: 'Medium', flexibility: 'Low', tempResistance: 'Low', difficulty: 'Easy' },
    colors: [{ name: 'Default', hex: '#ffffff' }],
  })

  const supabase = createClient(getSupabaseUrl(), getSupabaseServiceRoleKey())

  useEffect(() => {
    fetchMaterials()
  }, [])

  async function fetchMaterials() {
    setLoading(true)
    const { data, error } = await supabase
      .from('materials')
      .select('*')
      .order('created_at', { ascending: true })

    if (!error && data) {
      setMaterials(data.map(row => ({
        id: row.id,
        name: row.name,
        icon: row.icon || '🧩',
        summary: row.summary || '',
        density: row.density || 1.24,
        pricePerGram: row.price_per_gram || 2.8,
        machineRate: row.machine_rate || 180,
        multiplier: row.multiplier || 1.0,
        recommendedFor: row.recommended_for || '',
        properties: row.properties || {},
        colors: row.colors || [],
      })))
    }
    setLoading(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    
    const payload = {
      id: formData.id,
      name: formData.name,
      icon: formData.icon,
      summary: formData.summary,
      density: formData.density,
      price_per_gram: formData.pricePerGram,
      machine_rate: formData.machineRate,
      multiplier: formData.multiplier,
      recommended_for: formData.recommendedFor,
      properties: formData.properties,
      colors: formData.colors,
    }

    if (editingMaterial) {
      const { error } = await supabase
        .from('materials')
        .update(payload)
        .eq('id', editingMaterial.id)
      
      if (!error) {
        setShowForm(false)
        setEditingMaterial(null)
        resetForm()
        fetchMaterials()
      }
    } else {
      const { error } = await supabase
        .from('materials')
        .insert([payload])
      
      if (!error) {
        setShowForm(false)
        resetForm()
        fetchMaterials()
      }
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Are you sure you want to delete this material?')) return
    
    const { error } = await supabase
      .from('materials')
      .delete()
      .eq('id', id)
    
    if (!error) {
      fetchMaterials()
    }
  }

  function handleEdit(material: QuoteMaterial) {
    setEditingMaterial(material)
    setFormData({
      id: material.id,
      name: material.name,
      icon: material.icon,
      summary: material.summary,
      density: material.density,
      pricePerGram: material.pricePerGram,
      machineRate: material.machineRate,
      multiplier: material.multiplier,
      recommendedFor: material.recommendedFor,
      properties: material.properties,
      colors: material.colors,
    })
    setShowForm(true)
  }

  function resetForm() {
    setFormData({
      id: '',
      name: '',
      icon: '🧩',
      summary: '',
      density: 1.24,
      pricePerGram: 2.8,
      machineRate: 180,
      multiplier: 1.0,
      recommendedFor: '',
      properties: { strength: 'Medium', flexibility: 'Low', tempResistance: 'Low', difficulty: 'Easy' },
      colors: [{ name: 'Default', hex: '#ffffff' }],
    })
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
                      <label className="mb-1 block text-sm text-[#7a82a0]">ID</label>
                      <input
                        type="text"
                        required
                        disabled={!!editingMaterial}
                        value={formData.id}
                        onChange={(e) => setFormData({ ...formData, id: e.target.value })}
                        className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                      />
                    </div>
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
                  <div>
                    <label className="mb-1 block text-sm text-[#7a82a0]">Recommended For</label>
                    <input
                      type="text"
                      value={formData.recommendedFor}
                      onChange={(e) => setFormData({ ...formData, recommendedFor: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2 text-sm text-white outline-none focus:border-[#FF5C1A]/30"
                    />
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
        </div>
      </div>
    </div>
  )
}
