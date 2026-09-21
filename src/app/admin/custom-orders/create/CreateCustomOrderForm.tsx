'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowLeft, ArrowRight, Save, User, Package, CreditCard, CheckCircle } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import type { CreateCustomOrderInput, SourceChannel, CustomOrderItem } from '@/lib/custom-orders/types'

const STEPS = [
  { id: 'customer', label: 'Customer', icon: User },
  { id: 'items', label: 'Items', icon: Package },
  { id: 'payment', label: 'Delivery & Notes', icon: CreditCard },
  { id: 'review', label: 'Review', icon: CheckCircle },
]

export default function CreateCustomOrderForm() {
  const router = useRouter()
  const [currentStep, setCurrentStep] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [toast, setToast] = useState<AdminToastState>(null)

  // Form State
  const [formData, setFormData] = useState<Partial<CreateCustomOrderInput>>({
    source_channel: 'whatsapp',
    items: [],
  })

  // Draft Item State
  const [draftItem, setDraftItem] = useState<Partial<Omit<CustomOrderItem, 'id' | 'order_id'>>>({
    description: '',
    material: 'PLA',
    color: '',
    quantity: 1,
    unit_price: 0,
  })

  const handleNext = () => {
    // Basic validation per step
    if (currentStep === 0) {
      if (!formData.customer_name || !formData.customer_phone) {
        setToast({ type: 'error', message: 'Name and Phone are required' })
        return
      }
    } else if (currentStep === 1) {
      if (!formData.items || formData.items.length === 0) {
        setToast({ type: 'error', message: 'Add at least one item' })
        return
      }
    }
    setCurrentStep((prev) => Math.min(prev + 1, STEPS.length - 1))
  }

  const handleBack = () => {
    setCurrentStep((prev) => Math.max(prev - 1, 0))
  }

  const handleAddItem = () => {
    if (!draftItem.description || !draftItem.color || !draftItem.unit_price) {
      setToast({ type: 'error', message: 'Please fill in all item details' })
      return
    }
    
    setFormData(prev => ({
      ...prev,
      items: [...(prev.items || []), draftItem as Omit<CustomOrderItem, 'id' | 'order_id'>]
    }))
    
    // Reset draft
    setDraftItem({
      description: '',
      material: 'PLA',
      color: '',
      quantity: 1,
      unit_price: 0,
    })
  }
  
  const handleRemoveItem = (index: number) => {
    setFormData(prev => {
      const newItems = [...(prev.items || [])]
      newItems.splice(index, 1)
      return { ...prev, items: newItems }
    })
  }

  const handleSubmit = async () => {
    setIsSubmitting(true)
    try {
      const response = await fetch('/api/admin/custom-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      })
      
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to create order')
      
      setToast({ type: 'success', message: 'Order created successfully!' })
      setTimeout(() => {
        router.push(`/admin/custom-orders/${data.id}`)
      }, 1000)
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Error submitting form' })
      setIsSubmitting(false)
    }
  }

  return (
    <div className="space-y-8">
      <AdminToast toast={toast} />
      
      <div className="flex items-center gap-4">
        <button onClick={() => router.back()} className="rounded-full p-2 hover:bg-gray-100">
          <ArrowLeft className="h-5 w-5 text-gray-600" />
        </button>
        <div>
          <h1 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">Create Custom Order</h1>
          <p className="text-sm text-[#6F7192]">Draft a new custom 3D printing order.</p>
        </div>
      </div>

      {/* Progress Steps */}
      <div className="relative mx-auto max-w-3xl">
        <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-gray-100" />
        <div 
          className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-[#6d28d9] transition-all duration-300"
          style={{ width: `${(currentStep / (STEPS.length - 1)) * 100}%` }}
        />
        <div className="relative flex justify-between">
          {STEPS.map((step, index) => {
            const Icon = step.icon
            const isActive = index === currentStep
            const isPast = index < currentStep
            
            return (
              <div key={step.id} className="flex flex-col items-center">
                <div 
                  className={`flex h-10 w-10 items-center justify-center rounded-full border-2 transition-colors duration-300 ${
                    isActive ? 'border-[#6d28d9] bg-white text-[#6d28d9]' :
                    isPast ? 'border-[#6d28d9] bg-[#6d28d9] text-white' :
                    'border-gray-200 bg-white text-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                </div>
                <div className={`mt-2 text-xs font-semibold ${isActive || isPast ? 'text-[#0F1B3D]' : 'text-gray-400'}`}>
                  {step.label}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Form Content */}
      <div className="mx-auto max-w-3xl rounded-2xl border border-gray-200 bg-white p-6 shadow-sm sm:p-8">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {currentStep === 0 && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-[#0F1B3D]">Customer Details</h2>
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#0F1B3D]">Full Name *</label>
                    <input
                      type="text"
                      required
                      value={formData.customer_name || ''}
                      onChange={(e) => setFormData(p => ({ ...p, customer_name: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#6d28d9]"
                      placeholder="John Doe"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#0F1B3D]">Phone Number *</label>
                    <input
                      type="tel"
                      required
                      value={formData.customer_phone || ''}
                      onChange={(e) => setFormData(p => ({ ...p, customer_phone: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#6d28d9]"
                      placeholder="+91 9876543210"
                    />
                  </div>
                  <div className="space-y-2 sm:col-span-2">
                    <label className="text-sm font-semibold text-[#0F1B3D]">Email Address (Optional)</label>
                    <input
                      type="email"
                      value={formData.customer_email || ''}
                      onChange={(e) => setFormData(p => ({ ...p, customer_email: e.target.value }))}
                      className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#6d28d9]"
                      placeholder="john@example.com"
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 1 && (
              <div className="space-y-8">
                <h2 className="text-lg font-bold text-[#0F1B3D]">Order Items</h2>
                
                {/* Draft Item Form */}
                <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
                  <h3 className="mb-4 text-sm font-semibold text-[#0F1B3D]">Add New Item</h3>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2 sm:col-span-2">
                      <label className="text-xs font-semibold text-[#6F7192]">Description *</label>
                      <input
                        type="text"
                        value={draftItem.description || ''}
                        onChange={(e) => setDraftItem(p => ({ ...p, description: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-[#6d28d9]"
                        placeholder="e.g. Custom Keychain with name"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#6F7192]">Material</label>
                      <select
                        value={draftItem.material || 'PLA'}
                        onChange={(e) => setDraftItem(p => ({ ...p, material: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-[#6d28d9]"
                      >
                        <option value="PLA">PLA</option>
                        <option value="PETG">PETG</option>
                        <option value="ABS">ABS</option>
                        <option value="TPU">TPU (Flexible)</option>
                        <option value="Resin">Resin</option>
                      </select>
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#6F7192]">Color *</label>
                      <input
                        type="text"
                        value={draftItem.color || ''}
                        onChange={(e) => setDraftItem(p => ({ ...p, color: e.target.value }))}
                        className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-[#6d28d9]"
                        placeholder="e.g. Matte Black"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#6F7192]">Quantity</label>
                      <input
                        type="number"
                        min="1"
                        value={draftItem.quantity || 1}
                        onChange={(e) => setDraftItem(p => ({ ...p, quantity: parseInt(e.target.value) || 1 }))}
                        className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-[#6d28d9]"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-semibold text-[#6F7192]">Unit Price (₹) *</label>
                      <input
                        type="number"
                        min="0"
                        value={draftItem.unit_price || ''}
                        onChange={(e) => setDraftItem(p => ({ ...p, unit_price: parseInt(e.target.value) || 0 }))}
                        className="w-full rounded-lg border border-gray-200 p-2 text-sm outline-none focus:border-[#6d28d9]"
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <button
                      type="button"
                      onClick={handleAddItem}
                      className="rounded-lg bg-[#0F1B3D] px-4 py-2 text-sm font-semibold text-white hover:bg-[#1a2b5e]"
                    >
                      Add Item
                    </button>
                  </div>
                </div>

                {/* Added Items List */}
                {formData.items && formData.items.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-[#0F1B3D]">Added Items ({formData.items.length})</h3>
                    {formData.items.map((item, idx) => (
                      <div key={idx} className="flex items-center justify-between rounded-xl border border-gray-200 p-4">
                        <div>
                          <div className="font-semibold text-[#0F1B3D]">{item.description}</div>
                          <div className="text-xs text-[#6F7192]">
                            {item.quantity}x • {item.material} • {item.color}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="font-bold text-[#0F1B3D]">₹{item.quantity * item.unit_price}</div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(idx)}
                            className="text-sm font-medium text-rose-600 hover:text-rose-700"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                    <div className="flex justify-end p-2 text-lg font-bold text-[#0F1B3D]">
                      Total: ₹{formData.items.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-[#0F1B3D]">Delivery & Notes</h2>
                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#0F1B3D]">Source Channel</label>
                    <select
                      value={formData.source_channel || 'whatsapp'}
                      onChange={(e) => setFormData(p => ({ ...p, source_channel: e.target.value as SourceChannel }))}
                      className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#6d28d9]"
                    >
                      <option value="whatsapp">WhatsApp</option>
                      <option value="instagram">Instagram</option>
                      <option value="email">Email</option>
                      <option value="phone">Phone Call</option>
                      <option value="in_person">In Person</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#0F1B3D]">Delivery Address (Optional)</label>
                    <textarea
                      value={formData.delivery_address || ''}
                      onChange={(e) => setFormData(p => ({ ...p, delivery_address: e.target.value }))}
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#6d28d9]"
                      placeholder="Full shipping address if delivery is required..."
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <label className="text-sm font-semibold text-[#0F1B3D]">Admin Notes (Internal only)</label>
                    <textarea
                      value={formData.admin_notes || ''}
                      onChange={(e) => setFormData(p => ({ ...p, admin_notes: e.target.value }))}
                      rows={3}
                      className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#6d28d9]"
                      placeholder="Any special instructions or notes..."
                    />
                  </div>
                </div>
              </div>
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-lg font-bold text-[#0F1B3D]">Review Order</h2>
                
                <div className="grid gap-6 sm:grid-cols-2">
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6F7192]">Customer</h3>
                    <div className="font-semibold text-[#0F1B3D]">{formData.customer_name}</div>
                    <div className="text-sm text-[#6F7192]">{formData.customer_phone}</div>
                    {formData.customer_email && <div className="text-sm text-[#6F7192]">{formData.customer_email}</div>}
                    <div className="mt-2 text-xs text-[#6F7192]">Source: {formData.source_channel}</div>
                  </div>
                  
                  <div className="rounded-xl border border-gray-200 p-4">
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6F7192]">Delivery</h3>
                    <div className="whitespace-pre-line text-sm text-[#0F1B3D]">
                      {formData.delivery_address || 'No address provided (Pickup/Pending)'}
                    </div>
                  </div>
                </div>

                <div className="rounded-xl border border-gray-200 p-4">
                  <h3 className="mb-4 text-xs font-bold uppercase tracking-wider text-[#6F7192]">Items Overview</h3>
                  <div className="space-y-3">
                    {formData.items?.map((item, idx) => (
                      <div key={idx} className="flex justify-between text-sm">
                        <div className="text-[#0F1B3D]">
                          {item.quantity}x {item.description} ({item.material}, {item.color})
                        </div>
                        <div className="font-semibold">₹{item.quantity * item.unit_price}</div>
                      </div>
                    ))}
                    <div className="mt-4 flex justify-between border-t border-gray-100 pt-4 text-lg font-bold text-[#0F1B3D]">
                      <div>Total Amount</div>
                      <div>₹{formData.items?.reduce((sum, item) => sum + (item.quantity * item.unit_price), 0)}</div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </AnimatePresence>

        {/* Action Buttons */}
        <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-6">
          <button
            type="button"
            onClick={handleBack}
            disabled={currentStep === 0 || isSubmitting}
            className="inline-flex h-10 items-center justify-center rounded-xl border border-gray-200 px-4 text-sm font-semibold text-[#6F7192] hover:bg-gray-50 disabled:invisible"
          >
            Back
          </button>
          
          {currentStep < STEPS.length - 1 ? (
            <button
              type="button"
              onClick={handleNext}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-[#6d28d9] px-6 text-sm font-semibold text-white hover:bg-[#5b21b6]"
            >
              Next Step
              <ArrowRight className="h-4 w-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="inline-flex h-10 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-6 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-70"
            >
              {isSubmitting ? 'Saving...' : 'Create Order'}
              <Save className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
