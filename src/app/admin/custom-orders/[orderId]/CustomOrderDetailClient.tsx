'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Save, Link as LinkIcon, User, Package, MapPin, MessageSquare, Copy, ExternalLink, RefreshCw } from 'lucide-react'
import AdminToast, { type AdminToastState } from '@/components/admin/AdminToast'
import { CustomOrder, CustomOrderStatus, PaymentStatus, CustomOrderStatusLabels, CustomOrderStatusColors, PaymentStatusLabels, PaymentStatusColors } from '@/lib/custom-orders/types'

function formatDate(value: string | null) {
  if (!value) return 'N/A'
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric' }).format(new Date(value))
}

export default function CustomOrderDetailClient({ orderId }: { orderId: string }) {
  const router = useRouter()
  const [order, setOrder] = useState<CustomOrder | null>(null)
  const [loading, setLoading] = useState(true)
  const [toast, setToast] = useState<AdminToastState>(null)
  const [generatingLink, setGeneratingLink] = useState(false)
  const [isUpdating, setIsUpdating] = useState(false)
  const [generatingReviewLink, setGeneratingReviewLink] = useState(false)
  const [reviewLink, setReviewLink] = useState<string | null>(null)

  const [editMode, setEditMode] = useState(false)
  const [editNotes, setEditNotes] = useState('')
  const [editAddress, setEditAddress] = useState('')

  const loadOrder = useCallback(async () => {
    try {
      const response = await fetch(`/api/admin/custom-orders/${orderId}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to load order')
      setOrder(data)
      setEditNotes(data.admin_notes || '')
      setEditAddress(data.delivery_address || '')
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Error loading order' })
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    void loadOrder()
  }, [loadOrder])

  const updateStatus = async (status: CustomOrderStatus) => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/custom-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update status')
      setOrder(data)
      setToast({ type: 'success', message: 'Status updated' })
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Error updating status' })
    } finally {
      setIsUpdating(false)
    }
  }

  
  const generateReviewLink = async () => {
    setGeneratingReviewLink(true)
    try {
      const response = await fetch(`/api/admin/orders/${orderId}/review-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order_type: 'custom_order' })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate review link')
      setReviewLink(data.url)
      setToast({ type: 'success', message: 'Review link generated' })
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Error generating link' })
    } finally {
      setGeneratingReviewLink(false)
    }
  }

  const generatePaymentLink = async () => {
    setGeneratingLink(true)
    try {
      const response = await fetch(`/api/admin/custom-orders/${orderId}/payment-link`, {
        method: 'POST'
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to generate payment link')
      setOrder(data)
      setToast({ type: 'success', message: 'Payment link generated' })
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Error generating link' })
    } finally {
      setGeneratingLink(false)
    }
  }

  const saveEdits = async () => {
    setIsUpdating(true)
    try {
      const response = await fetch(`/api/admin/custom-orders/${orderId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          admin_notes: editNotes,
          delivery_address: editAddress
        })
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Failed to update details')
      setOrder(data)
      setEditMode(false)
      setToast({ type: 'success', message: 'Details updated' })
    } catch (error) {
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Error updating details' })
    } finally {
      setIsUpdating(false)
    }
  }

  if (loading) {
    return <div className="p-8 text-center text-[#6F7192]">Loading order details...</div>
  }

  if (!order) {
    return <div className="p-8 text-center text-rose-600">Order not found</div>
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminToast toast={toast} />
      
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => router.push('/admin/custom-orders')} className="rounded-full p-2 hover:bg-gray-100">
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </button>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="font-[var(--font-syne)] text-2xl font-bold text-[#0F1B3D]">{order.order_number}</h1>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${CustomOrderStatusColors[order.status]}`}>
                {CustomOrderStatusLabels[order.status]}
              </span>
            </div>
            <p className="text-sm text-[#6F7192]">Created on {formatDate(order.created_at)}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          <select
            value={order.status}
            onChange={(e) => updateStatus(e.target.value as CustomOrderStatus)}
            disabled={isUpdating}
            className="h-10 rounded-xl border border-gray-200 bg-white px-4 text-sm font-semibold text-[#0F1B3D] outline-none focus:border-[#6d28d9]"
          >
            {Object.entries(CustomOrderStatusLabels).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Main Content */}
        <div className="space-y-6 lg:col-span-2">
          {/* Items Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-[#6d28d9]" />
              <h2 className="text-lg font-bold text-[#0F1B3D]">Order Items</h2>
            </div>
            
            <div className="space-y-4">
              {order.items?.map((item, idx) => (
                <div key={idx} className="flex items-start justify-between rounded-xl border border-gray-100 bg-gray-50/50 p-4">
                  <div>
                    <div className="font-semibold text-[#0F1B3D]">{item.description}</div>
                    <div className="mt-1 flex gap-3 text-sm text-[#6F7192]">
                      <span className="font-medium text-[#0F1B3D]">Qty: {item.quantity}</span>
                      <span>•</span>
                      <span>{item.material}</span>
                      <span>•</span>
                      <span>{item.color}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-bold text-[#0F1B3D]">₹{item.quantity * item.unit_price}</div>
                    <div className="text-xs text-[#6F7192]">₹{item.unit_price} each</div>
                  </div>
                </div>
              ))}
              
              <div className="flex items-center justify-between border-t border-gray-100 pt-4">
                <div className="font-bold text-[#0F1B3D]">Total Amount</div>
                <div className="text-xl font-black text-[#6d28d9]">₹{order.total_amount.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* Delivery & Notes Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MapPin className="h-5 w-5 text-[#6d28d9]" />
                <h2 className="text-lg font-bold text-[#0F1B3D]">Delivery & Notes</h2>
              </div>
              {!editMode ? (
                <button 
                  onClick={() => setEditMode(true)} 
                  className="text-sm font-semibold text-[#6d28d9] hover:underline"
                >
                  Edit Details
                </button>
              ) : (
                <div className="flex gap-2">
                  <button 
                    onClick={() => {
                      setEditMode(false)
                      setEditNotes(order.admin_notes || '')
                      setEditAddress(order.delivery_address || '')
                    }} 
                    className="text-sm font-medium text-[#6F7192] hover:underline"
                  >
                    Cancel
                  </button>
                  <button 
                    onClick={saveEdits}
                    disabled={isUpdating}
                    className="flex items-center gap-1 text-sm font-semibold text-[#6d28d9] hover:underline"
                  >
                    <Save className="h-4 w-4" /> Save
                  </button>
                </div>
              )}
            </div>

            <div className="space-y-6">
              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6F7192]">Delivery Address</h3>
                {editMode ? (
                  <textarea
                    value={editAddress}
                    onChange={(e) => setEditAddress(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#6d28d9]"
                    placeholder="Enter delivery address..."
                  />
                ) : (
                  <div className="whitespace-pre-line rounded-xl bg-gray-50 p-4 text-sm text-[#0F1B3D]">
                    {order.delivery_address || 'No delivery address provided'}
                  </div>
                )}
              </div>

              <div>
                <h3 className="mb-2 text-xs font-bold uppercase tracking-wider text-[#6F7192]">Admin Notes</h3>
                {editMode ? (
                  <textarea
                    value={editNotes}
                    onChange={(e) => setEditNotes(e.target.value)}
                    rows={4}
                    className="w-full rounded-xl border border-gray-200 p-3 text-sm outline-none focus:border-[#6d28d9]"
                    placeholder="Internal notes..."
                  />
                ) : (
                  <div className="whitespace-pre-line rounded-xl bg-yellow-50/50 p-4 text-sm text-yellow-900 border border-yellow-100">
                    {order.admin_notes || 'No notes added'}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Customer Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <User className="h-5 w-5 text-[#6d28d9]" />
              <h2 className="text-lg font-bold text-[#0F1B3D]">Customer</h2>
            </div>
            
            <div className="space-y-3">
              <div>
                <div className="text-sm font-semibold text-[#0F1B3D]">{order.customer_name}</div>
                <div className="text-sm text-[#6F7192]">{order.customer_phone}</div>
                {order.customer_email && <div className="text-sm text-[#6F7192]">{order.customer_email}</div>}
              </div>
              <div className="border-t border-gray-100 pt-3">
                <div className="text-xs text-[#6F7192]">Source Channel</div>
                <div className="font-medium capitalize text-[#0F1B3D]">{order.source_channel.replace('_', ' ')}</div>
              </div>
            </div>
          </div>

          
          {/* Review Card */}
          {order.status === 'delivered' && (
            <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-[#0F1B3D]">Review</h2>
              </div>
              <div className="space-y-4">
                {reviewLink ? (
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-1 text-xs font-semibold text-[#6F7192]">Review Link</div>
                    <div className="flex items-center gap-2">
                      <input 
                        readOnly 
                        value={reviewLink} 
                        className="w-full bg-transparent text-sm text-[#0F1B3D] outline-none"
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(reviewLink)
                          setToast({ type: 'success', message: 'Link copied to clipboard' })
                        }}
                        className="text-[#6F7192] hover:text-[#6d28d9]"
                        title="Copy link"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ) : (
                  <button
                    onClick={generateReviewLink}
                    disabled={generatingReviewLink}
                    className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#6d28d9] py-2.5 text-sm font-semibold text-[#6d28d9] shadow-sm hover:bg-purple-50 disabled:opacity-70"
                  >
                    {generatingReviewLink ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <MessageSquare className="h-4 w-4" />
                    )}
                    Request a Review
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Payment Card */}
          <div className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[#0F1B3D]">Payment</h2>
              <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${PaymentStatusColors[order.payment_status]}`}>
                {PaymentStatusLabels[order.payment_status]}
              </span>
            </div>

            <div className="space-y-4">
              {order.payment_link_url ? (
                <div className="space-y-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                    <div className="mb-1 text-xs font-semibold text-[#6F7192]">Payment Link</div>
                    <div className="flex items-center gap-2">
                      <input 
                        readOnly 
                        value={order.payment_link_url} 
                        className="w-full bg-transparent text-sm text-[#0F1B3D] outline-none"
                      />
                      <button 
                        onClick={() => {
                          navigator.clipboard.writeText(order.payment_link_url!)
                          setToast({ type: 'success', message: 'Link copied to clipboard' })
                        }}
                        className="text-[#6F7192] hover:text-[#6d28d9]"
                        title="Copy link"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <a 
                        href={order.payment_link_url} 
                        target="_blank" 
                        rel="noreferrer"
                        className="text-[#6F7192] hover:text-[#6d28d9]"
                        title="Open link"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>
                  {order.payment_status !== 'paid' && (
                    <button
                      onClick={loadOrder}
                      className="flex w-full items-center justify-center gap-2 rounded-xl border border-gray-200 py-2.5 text-sm font-semibold text-[#0F1B3D] hover:bg-gray-50"
                    >
                      <RefreshCw className="h-4 w-4" /> Check Status
                    </button>
                  )}
                </div>
              ) : (
                <button
                  onClick={generatePaymentLink}
                  disabled={generatingLink}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#0F1B3D] py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-[#1a2b5e] disabled:opacity-70"
                >
                  {generatingLink ? (
                    <RefreshCw className="h-4 w-4 animate-spin" />
                  ) : (
                    <LinkIcon className="h-4 w-4" />
                  )}
                  Generate Payment Link
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
