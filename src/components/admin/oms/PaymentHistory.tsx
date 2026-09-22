'use client';

import { useState } from 'react';
import { CreditCard, Plus, Check, X } from 'lucide-react';

interface Transaction {
  id: string;
  amount: number;
  payment_method: string;
  payment_status: string;
  reference_id?: string;
  notes?: string;
  transaction_date: string;
}

const METHOD_LABELS: Record<string, string> = {
  upi: 'UPI',
  cash: 'Cash',
  bank_transfer: 'Bank Transfer',
  razorpay: 'Razorpay',
  card: 'Card',
  whatsapp_payment: 'WhatsApp Pay',
  cod: 'COD',
  other: 'Other',
};

const METHODS = Object.entries(METHOD_LABELS);

interface PaymentHistoryProps {
  orderId: string;
  transactions: Transaction[];
  onRecorded: () => void;
}

export default function PaymentHistory({ orderId, transactions, onRecorded }: PaymentHistoryProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    paymentMethod: 'upi',
    referenceId: '',
    notes: '',
    transactionDate: new Date().toISOString().slice(0, 16),
  });

  const record = async () => {
    if (!form.amount) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/oms/orders/${orderId}/payments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) {
        setShowForm(false);
        setForm({ amount: '', paymentMethod: 'upi', referenceId: '', notes: '', transactionDate: new Date().toISOString().slice(0, 16) });
        onRecorded();
      } else {
        const d = await res.json();
        alert(d.error);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <CreditCard className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Payment History</h3>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancel' : 'Record Payment'}
        </button>
      </div>

      {/* Record payment form */}
      {showForm && (
        <div className="px-4 py-3 border-b border-gray-100 bg-indigo-50/50 space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Amount (₹) *</label>
              <input
                type="number" min={1} step="0.01"
                value={form.amount}
                onChange={e => setForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="500.00"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Method *</label>
              <select
                value={form.paymentMethod}
                onChange={e => setForm(p => ({ ...p, paymentMethod: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                {METHODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Reference ID</label>
              <input
                type="text"
                value={form.referenceId}
                onChange={e => setForm(p => ({ ...p, referenceId: e.target.value }))}
                placeholder="UPI ref / TxnID"
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date & Time</label>
              <input
                type="datetime-local"
                value={form.transactionDate}
                onChange={e => setForm(p => ({ ...p, transactionDate: e.target.value }))}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Notes</label>
            <input
              type="text"
              value={form.notes}
              onChange={e => setForm(p => ({ ...p, notes: e.target.value }))}
              placeholder="Optional note..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
            />
          </div>
          <button
            onClick={record}
            disabled={loading || !form.amount}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loading ? 'Recording...' : 'Record Payment'}
          </button>
        </div>
      )}

      {/* Transaction list */}
      {transactions.length === 0 ? (
        <div className="px-4 py-6 text-center text-sm text-gray-400">No payments recorded yet.</div>
      ) : (
        <div className="divide-y divide-gray-50">
          {transactions.map((txn, i) => (
            <div key={txn.id} className="px-4 py-3 flex items-start gap-3">
              <div className="w-6 h-6 rounded-full bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                <Check className="w-3.5 h-3.5 text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-semibold text-gray-900 text-sm">₹{Number(txn.amount).toFixed(2)}</span>
                  <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-medium">
                    {METHOD_LABELS[txn.payment_method] || txn.payment_method}
                  </span>
                  {txn.reference_id && (
                    <span className="text-xs text-gray-400 font-mono">{txn.reference_id}</span>
                  )}
                </div>
                {txn.notes && <p className="text-xs text-gray-400 mt-0.5">{txn.notes}</p>}
              </div>
              <div className="text-xs text-gray-400 whitespace-nowrap shrink-0">
                {new Date(txn.transaction_date).toLocaleDateString('en-IN', {
                  day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
