/* eslint-disable */
// @ts-nocheck
'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Check, User, Package, Tag, Wallet, FileText, ClipboardList } from 'lucide-react';
import CustomerSearchWidget from '@/components/admin/oms/CustomerSearchWidget';
import LineItemEditor from '@/components/admin/oms/LineItemEditor';
import PricingBreakdown from '@/components/admin/oms/PricingBreakdown';

const STEPS = [
  { id: 1, label: 'Customer',   icon: User },
  { id: 2, label: 'Order Info', icon: Tag },
  { id: 3, label: 'Items',      icon: Package },
  { id: 4, label: 'Pricing',    icon: Wallet },
  { id: 5, label: 'Notes',      icon: FileText },
  { id: 6, label: 'Review',     icon: ClipboardList },
];

const SOURCES = [
  'WhatsApp', 'Instagram', 'Website', 'Phone',
  'Local', 'Walk-in', 'Referral', 'Meesho', 'IndiaMART', 'Other'
];

const variants = {
  initial: { opacity: 0, x: 24 },
  animate: { opacity: 1, x: 0 },
  exit:    { opacity: 0, x: -24 },
};

export default function CreateOMSOrderPage() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);

  // Step 1 — Customer
  const [selectedCustomer, setSelectedCustomer] = useState(null);

  // Step 2 — Order meta
  const [orderMeta, setOrderMeta] = useState({
    source: 'WhatsApp',
    sourceReference: '',
    orderDate: new Date().toISOString().slice(0, 10),
  });

  // Step 3 — Items
  const [items, setItems] = useState([{
    productName: '', description: '', quantity: 1, unitPrice: 0, discount: 0, tax: 0,
    customAttributes: {},
  }]);

  // Step 4 — Pricing
  const [pricing, setPricing] = useState({ discount: 0, shippingCost: 0, tax: 0 });

  // Step 5 — Notes
  const [notes, setNotes] = useState({ customerNotes: '', internalNotes: '' });

  // Computed
  const itemsSubtotal = items.reduce(
    (sum, item) => sum + (item.quantity * item.unitPrice) - item.discount,
    0
  );
  const grandTotal = itemsSubtotal - pricing.discount + pricing.shippingCost + pricing.tax;

  const next = () => setStep(s => Math.min(s + 1, 6));
  const prev = () => setStep(s => Math.max(s - 1, 1));

  const canAdvance = () => {
    if (step === 1) return !!selectedCustomer;
    if (step === 2) return !!orderMeta.source && !!orderMeta.orderDate;
    if (step === 3) return items.some(i => i.productName.trim() && i.unitPrice >= 0);
    return true;
  };

  const submit = async () => {
    setLoading(true);
    try {
      const cust = selectedCustomer as any;
      const body = {
        // Customer — pass id if existing, or fields for new
        ...(cust.id !== '__new__' ? { customerId: cust.id } : {
          customerName: cust.full_name,
          customerPhone: cust.phone,
          customerEmail: cust.email,
          customerType: cust.customer_type,
          companyName: cust.company_name,
          gstin: cust.gstin,
        }),
        source: orderMeta.source.toLowerCase().replace(/[\s-]/g, '_'),
        sourceReference: orderMeta.sourceReference || undefined,
        orderDate: orderMeta.orderDate,
        items: items.map(i => ({
          productName: i.productName,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          discount: i.discount,
          tax: i.tax,
          customAttributes: Object.fromEntries(
            Object.entries(i.customAttributes).filter(([, v]) => v)
          ),
        })),
        discount: pricing.discount,
        shippingCost: pricing.shippingCost,
        tax: pricing.tax,
        customerNotes: notes.customerNotes || undefined,
        internalNotes: notes.internalNotes || undefined,
      };

      const res = await fetch('/api/admin/oms/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        router.push(`/admin/custom-orders/${data.order.id}`);
      } else {
        alert(data.error || 'Failed to create order');
      }
    } catch (err) {
      console.error(err);
      alert('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Create Manual Order</h1>
        <p className="text-sm text-gray-500 mt-1">WhatsApp, walk-in, phone, or any offline order.</p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center mb-8 overflow-x-auto pb-1">
        {STEPS.map((s, i) => {
          const Icon = s.icon;
          const done = step > s.id;
          const active = step === s.id;
          return (
            <div key={s.id} className="flex items-center shrink-0">
              <div
                className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  active ? 'bg-indigo-600 text-white shadow-sm' :
                  done   ? 'bg-indigo-50 text-indigo-600' :
                           'text-gray-400'
                }`}
              >
                {done
                  ? <Check className="w-3.5 h-3.5" />
                  : <Icon className="w-3.5 h-3.5" />
                }
                <span className="hidden sm:inline">{s.label}</span>
              </div>
              {i < STEPS.length - 1 && (
                <div className={`w-6 h-px mx-1 ${done ? 'bg-indigo-300' : 'bg-gray-200'}`} />
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">
        <AnimatePresence mode="wait">
          {/* Step 1 — Customer */}
          {step === 1 && (
            <motion.div key="s1" variants={variants} initial="initial" animate="animate" exit="exit"
              className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Customer</h2>
              <p className="text-sm text-gray-500 mb-4">Search by phone number to find an existing customer, or create a new one.</p>
              <CustomerSearchWidget
                onSelect={setSelectedCustomer}
                selected={selectedCustomer}
              />
            </motion.div>
          )}

          {/* Step 2 — Order Info */}
          {step === 2 && (
            <motion.div key="s2" variants={variants} initial="initial" animate="animate" exit="exit"
              className="p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Order Information</h2>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Order Source *</label>
                <div className="flex flex-wrap gap-2">
                  {SOURCES.map(s => (
                    <button
                      key={s}
                      onClick={() => setOrderMeta(p => ({ ...p, source: s }))}
                      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors border ${
                        orderMeta.source === s
                          ? 'bg-indigo-600 text-white border-indigo-600'
                          : 'bg-white text-gray-600 border-gray-200 hover:border-indigo-300 hover:text-indigo-600'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Source Reference</label>
                <input
                  type="text"
                  value={orderMeta.sourceReference}
                  onChange={e => setOrderMeta(p => ({ ...p, sourceReference: e.target.value }))}
                  placeholder="e.g. WhatsApp conversation link, DM thread ID..."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Order Date *
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    When did the customer actually place this order?
                  </span>
                </label>
                <input
                  type="date"
                  value={orderMeta.orderDate}
                  onChange={e => setOrderMeta(p => ({ ...p, orderDate: e.target.value }))}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <p className="text-xs text-gray-400 mt-1">
                  Created At (system) will be recorded separately — you won't lose history.
                </p>
              </div>
            </motion.div>
          )}

          {/* Step 3 — Items */}
          {step === 3 && (
            <motion.div key="s3" variants={variants} initial="initial" animate="animate" exit="exit"
              className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Line Items</h2>
              <p className="text-sm text-gray-500 mb-4">Add products. Expand each item to set 3D print attributes.</p>
              <LineItemEditor items={items} onChange={setItems} />
            </motion.div>
          )}

          {/* Step 4 — Pricing */}
          {step === 4 && (
            <motion.div key="s4" variants={variants} initial="initial" animate="animate" exit="exit"
              className="p-6">
              <h2 className="text-base font-semibold text-gray-900 mb-4">Pricing Summary</h2>
              <PricingBreakdown
                subtotal={itemsSubtotal}
                discount={pricing.discount}
                shippingCost={pricing.shippingCost}
                tax={pricing.tax}
                grandTotal={grandTotal}
                amountPaid={0}
                amountDue={grandTotal}
                editable
                onChange={(field, value) => setPricing(p => ({ ...p, [field]: value }))}
              />
              <p className="text-xs text-gray-400 mt-3">
                You can record payments after the order is created.
              </p>
            </motion.div>
          )}

          {/* Step 5 — Notes */}
          {step === 5 && (
            <motion.div key="s5" variants={variants} initial="initial" animate="animate" exit="exit"
              className="p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Notes</h2>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Customer Notes
                  <span className="ml-2 text-xs font-normal text-green-600 bg-green-50 px-1.5 py-0.5 rounded">Visible to customer</span>
                </label>
                <textarea
                  value={notes.customerNotes}
                  onChange={e => setNotes(p => ({ ...p, customerNotes: e.target.value }))}
                  rows={3}
                  placeholder="e.g. Please make the model in white."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Internal Notes
                  <span className="ml-2 text-xs font-normal text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded">🔒 Never shared with customer</span>
                </label>
                <textarea
                  value={notes.internalNotes}
                  onChange={e => setNotes(p => ({ ...p, internalNotes: e.target.value }))}
                  rows={3}
                  placeholder="e.g. Customer needs this before Friday. Prioritize after current print."
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500 border-orange-100"
                />
              </div>
            </motion.div>
          )}

          {/* Step 6 — Review */}
          {step === 6 && (
            <motion.div key="s6" variants={variants} initial="initial" animate="animate" exit="exit"
              className="p-6 space-y-4">
              <h2 className="text-base font-semibold text-gray-900 mb-1">Review & Create</h2>

              {/* Customer */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-1.5">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Customer</p>
                <p className="font-medium text-gray-900">{(selectedCustomer as any)?.full_name}</p>
                <p className="text-sm text-gray-500">{[(selectedCustomer as any)?.phone, (selectedCustomer as any)?.email].filter(Boolean).join(' · ')}</p>
                {(selectedCustomer as any)?.company_name && <p className="text-sm text-gray-500">{(selectedCustomer as any).company_name}</p>}
              </div>

              {/* Order meta */}
              <div className="border border-gray-100 rounded-xl p-4 grid grid-cols-2 gap-2">
                <div><p className="text-xs text-gray-400">Source</p><p className="text-sm font-medium text-gray-900">{orderMeta.source}</p></div>
                <div><p className="text-xs text-gray-400">Order Date</p><p className="text-sm font-medium text-gray-900">{new Date(orderMeta.orderDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p></div>
                {orderMeta.sourceReference && <div className="col-span-2"><p className="text-xs text-gray-400">Reference</p><p className="text-sm text-gray-600">{orderMeta.sourceReference}</p></div>}
              </div>

              {/* Items */}
              <div className="border border-gray-100 rounded-xl p-4 space-y-2">
                <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">Items</p>
                {items.filter(i => i.productName).map((item, idx) => (
                  <div key={idx} className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{item.productName}</p>
                      <p className="text-xs text-gray-500">{item.quantity} × ₹{item.unitPrice.toFixed(2)}</p>
                      {item.customAttributes.material && (
                        <p className="text-xs text-gray-400">
                          {[item.customAttributes.material, item.customAttributes.color, item.customAttributes.infill && `Infill ${item.customAttributes.infill}`].filter(Boolean).join(' · ')}
                        </p>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      ₹{((item.quantity * item.unitPrice) - item.discount).toFixed(2)}
                    </p>
                  </div>
                ))}
              </div>

              {/* Pricing */}
              <PricingBreakdown
                subtotal={itemsSubtotal}
                discount={pricing.discount}
                shippingCost={pricing.shippingCost}
                tax={pricing.tax}
                grandTotal={grandTotal}
                amountPaid={0}
                amountDue={grandTotal}
              />

              {/* Notes summary */}
              {(notes.customerNotes || notes.internalNotes) && (
                <div className="border border-gray-100 rounded-xl p-4 space-y-2">
                  {notes.customerNotes && (
                    <div>
                      <p className="text-xs font-semibold text-green-600 mb-0.5">Customer Note</p>
                      <p className="text-sm text-gray-600">{notes.customerNotes}</p>
                    </div>
                  )}
                  {notes.internalNotes && (
                    <div>
                      <p className="text-xs font-semibold text-orange-600 mb-0.5">🔒 Internal Note</p>
                      <p className="text-sm text-gray-600">{notes.internalNotes}</p>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Navigation */}
        <div className="px-6 py-4 border-t border-gray-100 flex justify-between items-center bg-gray-50/50">
          <button
            onClick={prev}
            disabled={step === 1}
            className="px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 disabled:opacity-40 transition-colors"
          >
            ← Back
          </button>
          <span className="text-xs text-gray-400">Step {step} of {STEPS.length}</span>
          {step < 6 ? (
            <button
              onClick={next}
              disabled={!canAdvance()}
              className="px-5 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-40 transition-colors"
            >
              Next →
            </button>
          ) : (
            <button
              onClick={submit}
              disabled={loading}
              className="px-5 py-2 bg-green-600 text-white text-sm font-medium rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors"
            >
              {loading ? 'Creating...' : '✓ Create Order'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
