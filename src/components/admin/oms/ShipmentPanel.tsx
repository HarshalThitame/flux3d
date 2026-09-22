'use client';

import { useState } from 'react';
import { Truck, Plus, X, ExternalLink } from 'lucide-react';

interface Shipment {
  id: string;
  shipping_name: string;
  shipping_phone?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  pincode?: string;
  country?: string;
  landmark?: string;
  courier_name?: string;
  awb_number?: string;
  tracking_url?: string;
  shipping_method?: string;
  expected_ship_date?: string;
  actual_ship_date?: string;
  expected_delivery_date?: string;
  actual_delivery_date?: string;
  shipping_required: boolean;
}

interface ShipmentPanelProps {
  orderId: string;
  shipments: Shipment[];
  onUpdate: () => void;
}

const EMPTY_FORM = {
  shippingName: '', shippingPhone: '',
  addressLine1: '', addressLine2: '',
  city: '', state: '', pincode: '', country: 'India', landmark: '',
  courierName: '', awbNumber: '', trackingUrl: '', shippingMethod: '',
  expectedShipDate: '', actualShipDate: '',
  expectedDeliveryDate: '', actualDeliveryDate: '',
  shippingRequired: true,
};

export default function ShipmentPanel({ orderId, shipments, onUpdate }: ShipmentPanelProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({ ...EMPTY_FORM });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const save = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/oms/orders/${orderId}/shipment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (res.ok) { setShowForm(false); setForm({ ...EMPTY_FORM }); onUpdate(); }
      else { const d = await res.json(); alert(d.error); }
    } finally { setLoading(false); }
  };

  const primary = shipments[0];

  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between bg-gray-50">
        <div className="flex items-center gap-2">
          <Truck className="w-4 h-4 text-gray-500" />
          <h3 className="text-sm font-semibold text-gray-700">Shipping</h3>
        </div>
        <button
          onClick={() => setShowForm(v => !v)}
          className="flex items-center gap-1 text-xs text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
        >
          {showForm ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          {showForm ? 'Cancel' : 'Add Shipment'}
        </button>
      </div>

      {/* Add form */}
      {showForm && (
        <div className="px-4 py-4 border-b border-gray-100 space-y-4 bg-gray-50/50">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Delivery Address</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['shippingName', 'Recipient Name *', 'text', 'Harshal Thitame'],
              ['shippingPhone', 'Phone', 'tel', '+91 98765 43210'],
              ['addressLine1', 'Address Line 1', 'text', '123, Main Street'],
              ['addressLine2', 'Address Line 2', 'text', 'Near Park'],
              ['city', 'City', 'text', 'Pune'],
              ['state', 'State', 'text', 'Maharashtra'],
              ['pincode', 'Pincode', 'text', '411001'],
              ['country', 'Country', 'text', 'India'],
              ['landmark', 'Landmark', 'text', 'Near Bus Stop'],
            ].map(([k, l, t, p]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={t as string} value={(form as any)[k]} onChange={e => set(k as string, e.target.value)}
                  placeholder={p as string}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ))}
          </div>

          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide pt-2">Logistics</p>
          <div className="grid grid-cols-2 gap-3">
            {[
              ['courierName', 'Courier', 'text', 'Shiprocket / Delhivery'],
              ['awbNumber', 'AWB / Tracking No.', 'text', 'SR123456789'],
              ['shippingMethod', 'Shipping Method', 'text', 'Express'],
              ['trackingUrl', 'Tracking URL', 'url', 'https://...'],
              ['expectedShipDate', 'Expected Ship Date', 'date', ''],
              ['actualShipDate', 'Actual Ship Date', 'date', ''],
              ['expectedDeliveryDate', 'Expected Delivery', 'date', ''],
              ['actualDeliveryDate', 'Actual Delivery', 'date', ''],
            ].map(([k, l, t, p]) => (
              <div key={k}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{l}</label>
                <input type={t as string} value={(form as any)[k]} onChange={e => set(k as string, e.target.value)}
                  placeholder={p as string}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <input type="checkbox" id="shipReq" checked={form.shippingRequired}
              onChange={e => set('shippingRequired', e.target.checked)}
              className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
            <label htmlFor="shipReq" className="text-sm text-gray-700">Shipping required</label>
          </div>

          <button onClick={save} disabled={loading || !form.shippingName}
            className="w-full py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors">
            {loading ? 'Saving...' : 'Save Shipment'}
          </button>
        </div>
      )}

      {/* Primary shipment display */}
      {primary ? (
        <div className="px-4 py-3 space-y-3">
          <div className="space-y-1">
            <p className="font-medium text-gray-900 text-sm">{primary.shipping_name}</p>
            {primary.shipping_phone && <p className="text-xs text-gray-500">{primary.shipping_phone}</p>}
            <p className="text-xs text-gray-500 leading-relaxed">
              {[primary.address_line1, primary.address_line2, primary.city,
                primary.state, primary.pincode, primary.country].filter(Boolean).join(', ')}
            </p>
            {primary.landmark && <p className="text-xs text-gray-400">Near: {primary.landmark}</p>}
          </div>

          {(primary.courier_name || primary.awb_number) && (
            <div className="pt-2 border-t border-gray-100 space-y-1">
              {primary.courier_name && <div className="flex justify-between text-xs"><span className="text-gray-500">Courier</span><span className="font-medium text-gray-800">{primary.courier_name}</span></div>}
              {primary.awb_number && <div className="flex justify-between text-xs"><span className="text-gray-500">AWB</span><span className="font-mono text-gray-800">{primary.awb_number}</span></div>}
              {primary.shipping_method && <div className="flex justify-between text-xs"><span className="text-gray-500">Method</span><span className="text-gray-800">{primary.shipping_method}</span></div>}
              {primary.tracking_url && (
                <a href={primary.tracking_url} target="_blank" rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 pt-1">
                  <ExternalLink className="w-3 h-3" /> Track Shipment
                </a>
              )}
            </div>
          )}

          {(primary.expected_ship_date || primary.expected_delivery_date) && (
            <div className="pt-2 border-t border-gray-100 grid grid-cols-2 gap-2 text-xs">
              {primary.expected_ship_date && <div><p className="text-gray-400">Expected Ship</p><p className="font-medium text-gray-800">{new Date(primary.expected_ship_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p></div>}
              {primary.actual_ship_date && <div><p className="text-gray-400">Shipped</p><p className="font-medium text-green-700">{new Date(primary.actual_ship_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p></div>}
              {primary.expected_delivery_date && <div><p className="text-gray-400">Expected Delivery</p><p className="font-medium text-gray-800">{new Date(primary.expected_delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p></div>}
              {primary.actual_delivery_date && <div><p className="text-gray-400">Delivered</p><p className="font-medium text-green-700">{new Date(primary.actual_delivery_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</p></div>}
            </div>
          )}
        </div>
      ) : (
        <div className="px-4 py-6 text-center text-sm text-gray-400">No shipment added yet.</div>
      )}
    </div>
  );
}
