'use client';

import { useState, useCallback, useRef } from 'react';
import { Search, User, Building2, CheckCircle2, Plus } from 'lucide-react';

interface Customer {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  customer_type: string;
  company_name: string | null;
  gstin: string | null;
}

interface CustomerSearchWidgetProps {
  onSelect: (customer: Customer | null) => void;
  selected: Customer | null;
}

export default function CustomerSearchWidget({ onSelect, selected }: CustomerSearchWidgetProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [newCustomer, setNewCustomer] = useState({
    full_name: '', phone: '', email: '',
    customer_type: 'individual', company_name: '', gstin: '',
  });
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const search = useCallback(async (q: string) => {
    if (q.length < 3) { setResults([]); return; }
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/oms/customers/search?q=${encodeURIComponent(q)}`);
      const data = await res.json();
      setResults(data.customers || []);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleInput = (val: string) => {
    setQuery(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => search(val), 350);
  };

  if (selected) {
    return (
      <div className="rounded-xl border border-green-200 bg-green-50 p-4 flex items-start gap-3">
        <CheckCircle2 className="w-5 h-5 text-green-600 mt-0.5 shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="font-semibold text-gray-900">{selected.full_name}</p>
            {selected.customer_type === 'business' && (
              <span className="text-[10px] uppercase tracking-wide bg-indigo-100 text-indigo-700 px-1.5 py-0.5 rounded font-medium">Business</span>
            )}
          </div>
          {selected.phone && <p className="text-sm text-gray-600">{selected.phone}</p>}
          {selected.email && <p className="text-sm text-gray-500">{selected.email}</p>}
          {selected.company_name && <p className="text-sm text-gray-500">{selected.company_name}</p>}
        </div>
        <button
          onClick={() => { onSelect(null); setQuery(''); setResults([]); }}
          className="text-xs text-red-500 hover:text-red-700 font-medium shrink-0"
        >
          Change
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={e => handleInput(e.target.value)}
          placeholder="Search by phone number or name..."
          className="w-full pl-9 pr-4 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
        />
        {loading && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        )}
      </div>

      {/* Search results */}
      {results.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden divide-y divide-gray-100 bg-white shadow-sm">
          {results.map(c => (
            <button
              key={c.id}
              onClick={() => { onSelect(c); setResults([]); setQuery(''); }}
              className="w-full text-left px-4 py-3 hover:bg-indigo-50 transition-colors"
            >
              <div className="flex items-center gap-2">
                {c.customer_type === 'business'
                  ? <Building2 className="w-4 h-4 text-indigo-500 shrink-0" />
                  : <User className="w-4 h-4 text-gray-400 shrink-0" />
                }
                <span className="font-medium text-gray-900 text-sm">{c.full_name}</span>
                {c.customer_type === 'business' && c.company_name && (
                  <span className="text-xs text-gray-400">· {c.company_name}</span>
                )}
              </div>
              <div className="pl-6 text-xs text-gray-500 mt-0.5">
                {[c.phone, c.email].filter(Boolean).join(' · ')}
              </div>
            </button>
          ))}
        </div>
      )}

      {/* No results state */}
      {query.length >= 3 && results.length === 0 && !loading && (
        <p className="text-sm text-gray-500 text-center py-2">
          No existing customer found.
        </p>
      )}

      {/* Create new customer inline */}
      <div>
        <button
          onClick={() => setShowNew(v => !v)}
          className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
        >
          <Plus className="w-4 h-4" />
          {showNew ? 'Cancel' : 'Create new customer'}
        </button>

        {showNew && (
          <div className="mt-3 border border-gray-200 rounded-xl p-4 space-y-3 bg-gray-50">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Full Name *</label>
                <input
                  type="text"
                  value={newCustomer.full_name}
                  onChange={e => setNewCustomer(p => ({ ...p, full_name: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  placeholder="Harshal Thitame"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Phone *</label>
                <input
                  type="tel"
                  value={newCustomer.phone}
                  onChange={e => setNewCustomer(p => ({ ...p, phone: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  placeholder="+91 98765 43210"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Email</label>
                <input
                  type="email"
                  value={newCustomer.email}
                  onChange={e => setNewCustomer(p => ({ ...p, email: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                  placeholder="hello@example.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Customer Type</label>
                <select
                  value={newCustomer.customer_type}
                  onChange={e => setNewCustomer(p => ({ ...p, customer_type: e.target.value }))}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="individual">Individual</option>
                  <option value="business">Business</option>
                </select>
              </div>
              {newCustomer.customer_type === 'business' && (
                <>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Company Name</label>
                    <input
                      type="text"
                      value={newCustomer.company_name}
                      onChange={e => setNewCustomer(p => ({ ...p, company_name: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">GSTIN</label>
                    <input
                      type="text"
                      value={newCustomer.gstin}
                      onChange={e => setNewCustomer(p => ({ ...p, gstin: e.target.value }))}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      placeholder="27AAAAA0000A1Z5"
                    />
                  </div>
                </>
              )}
            </div>
            <button
              onClick={() => {
                if (!newCustomer.full_name) return;
                // Pass as a "new customer" object — the API will create it
                onSelect({ id: '__new__', ...newCustomer, full_name: newCustomer.full_name } as any);
                setShowNew(false);
              }}
              className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Use This Customer
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
