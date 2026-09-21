/* eslint-disable */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';

export default function CreateCustomOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    customerName: '',
    customerEmail: '',
    customerPhone: '',
    shippingAddress: {},
    items: [{ title: '', description: '', quantity: 1, unitPrice: 0 }],
    notes: ''
  });
  const [loading, setLoading] = useState(false);

  const nextStep = () => setStep(s => Math.min(s + 1, 4));
  const prevStep = () => setStep(s => Math.max(s - 1, 1));

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...formData.items];
    newItems[index] = { ...newItems[index], [field]: value };
    setFormData({ ...formData, items: newItems });
  };

  const addItem = () => {
    setFormData({
      ...formData,
      items: [...formData.items, { title: '', description: '', quantity: 1, unitPrice: 0 }]
    });
  };

  const removeItem = (index: number) => {
    const newItems = formData.items.filter((_, i) => i !== index);
    setFormData({ ...formData, items: newItems });
  };

  const subtotal = formData.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);

  const submitOrder = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/custom-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/admin/custom-orders/${data.order.id}`);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
      alert('An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const variants = {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 }
  };

  return (
    <div className="max-w-3xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-8">Create Custom Order</h1>
      
      {/* Step Indicator */}
      <div className="flex space-x-4 mb-8">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className={`flex-1 h-2 rounded-full ${step >= i ? 'bg-indigo-600' : 'bg-gray-200'}`} />
        ))}
      </div>

      <div className="bg-white rounded-xl shadow p-6">
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" variants={variants} initial="initial" animate="animate" exit="exit">
              <h2 className="text-xl font-semibold mb-4">1. Customer Data</h2>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Name</label>
                  <input type="text" className="w-full border p-2 rounded" value={formData.customerName} onChange={e => setFormData({...formData, customerName: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Email</label>
                  <input type="email" className="w-full border p-2 rounded" value={formData.customerEmail} onChange={e => setFormData({...formData, customerEmail: e.target.value})} />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">Phone</label>
                  <input type="text" className="w-full border p-2 rounded" value={formData.customerPhone} onChange={e => setFormData({...formData, customerPhone: e.target.value})} />
                </div>
              </div>
            </motion.div>
          )}

          {step === 2 && (
            <motion.div key="step2" variants={variants} initial="initial" animate="animate" exit="exit">
              <h2 className="text-xl font-semibold mb-4">2. Line Items</h2>
              {formData.items.map((item, index) => (
                <div key={index} className="border p-4 rounded mb-4 space-y-4 relative">
                  <button onClick={() => removeItem(index)} className="absolute top-2 right-2 text-red-500 text-sm">Remove</button>
                  <div>
                    <label className="block text-sm font-medium mb-1">Item Title</label>
                    <input type="text" className="w-full border p-2 rounded" value={item.title} onChange={e => handleItemChange(index, 'title', e.target.value)} />
                  </div>
                  <div className="flex space-x-4">
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Quantity</label>
                      <input type="number" min="1" className="w-full border p-2 rounded" value={item.quantity} onChange={e => handleItemChange(index, 'quantity', parseInt(e.target.value))} />
                    </div>
                    <div className="flex-1">
                      <label className="block text-sm font-medium mb-1">Unit Price (₹)</label>
                      <input type="number" min="0" className="w-full border p-2 rounded" value={item.unitPrice} onChange={e => handleItemChange(index, 'unitPrice', parseFloat(e.target.value))} />
                    </div>
                  </div>
                </div>
              ))}
              <button onClick={addItem} className="text-indigo-600 text-sm font-medium">+ Add another item</button>
              
              <div className="mt-6 text-right text-lg font-semibold">
                Subtotal: ₹{subtotal.toFixed(2)}
              </div>
            </motion.div>
          )}

          {step === 3 && (
            <motion.div key="step3" variants={variants} initial="initial" animate="animate" exit="exit">
              <h2 className="text-xl font-semibold mb-4">3. Delivery & Notes</h2>
              <div>
                <label className="block text-sm font-medium mb-1">Order Notes (Internal)</label>
                <textarea className="w-full border p-2 rounded" rows={4} value={formData.notes} onChange={e => setFormData({...formData, notes: e.target.value})}></textarea>
              </div>
            </motion.div>
          )}

          {step === 4 && (
            <motion.div key="step4" variants={variants} initial="initial" animate="animate" exit="exit">
              <h2 className="text-xl font-semibold mb-4">4. Summary Review</h2>
              <div className="space-y-4 text-sm">
                <p><strong>Customer:</strong> {formData.customerName} ({formData.customerEmail})</p>
                <div>
                  <strong>Items:</strong>
                  <ul className="list-disc pl-5 mt-2">
                    {formData.items.map((item, i) => (
                      <li key={i}>{item.quantity}x {item.title} @ ₹{item.unitPrice}</li>
                    ))}
                  </ul>
                </div>
                <p className="text-lg font-bold mt-4">Total: ₹{subtotal.toFixed(2)}</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="mt-8 flex justify-between">
          <button 
            disabled={step === 1} 
            onClick={prevStep}
            className={`px-4 py-2 rounded border ${step === 1 ? 'opacity-50' : 'hover:bg-gray-50'}`}
          >
            Back
          </button>
          
          {step < 4 ? (
            <button onClick={nextStep} className="px-4 py-2 rounded bg-indigo-600 text-white hover:bg-indigo-700">
              Next
            </button>
          ) : (
            <button onClick={submitOrder} disabled={loading} className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700">
              {loading ? 'Creating...' : 'Create Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
