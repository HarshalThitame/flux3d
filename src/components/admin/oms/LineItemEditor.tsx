'use client';

import { useState } from 'react';
import { Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react';

export interface LineItem {
  id?: string;
  productName: string;
  description: string;
  quantity: number;
  unitPrice: number;
  discount: number;
  tax: number;
  customAttributes: {
    material?: string;
    color?: string;
    layerHeight?: string;
    infill?: string;
    estimatedWeightG?: string;
    estimatedTimeMins?: string;
    printQuality?: string;
    customSpec?: string;
  };
}

const EMPTY_ITEM = (): LineItem => ({
  productName: '',
  description: '',
  quantity: 1,
  unitPrice: 0,
  discount: 0,
  tax: 0,
  customAttributes: {},
});

const MATERIALS = ['PLA', 'PETG', 'ABS', 'ASA', 'TPU', 'Nylon', 'Resin', 'Carbon Fiber', 'Other'];
const COLORS = ['White', 'Black', 'Grey', 'Red', 'Blue', 'Green', 'Yellow', 'Orange', 'Transparent', 'Other'];
const QUALITY = ['Draft (0.3mm)', 'Standard (0.2mm)', 'Fine (0.15mm)', 'Ultra Fine (0.1mm)'];
const INFILL = ['5%', '10%', '15%', '20%', '30%', '40%', '50%', '75%', '100%'];

interface LineItemEditorProps {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
}

export default function LineItemEditor({ items, onChange }: LineItemEditorProps) {
  const [expanded, setExpanded] = useState<Record<number, boolean>>({});

  const update = (index: number, patch: Partial<LineItem>) => {
    const next = [...items];
    next[index] = { ...next[index], ...patch };
    onChange(next);
  };

  const updateAttr = (index: number, patch: Partial<LineItem['customAttributes']>) => {
    const next = [...items];
    next[index] = {
      ...next[index],
      customAttributes: { ...next[index].customAttributes, ...patch },
    };
    onChange(next);
  };

  const remove = (index: number) => onChange(items.filter((_, i) => i !== index));
  const add = () => { onChange([...items, EMPTY_ITEM()]); setExpanded(p => ({ ...p, [items.length]: true })); };
  const toggle = (i: number) => setExpanded(p => ({ ...p, [i]: !p[i] }));

  return (
    <div className="space-y-3">
      {items.map((item, i) => {
        const subtotal = (item.quantity * item.unitPrice) - item.discount + item.tax;
        return (
          <div key={i} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
            {/* Item header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-gray-50">
              <span className="text-xs font-bold text-gray-400 w-5 text-center">{i + 1}</span>
              <input
                type="text"
                value={item.productName}
                onChange={e => update(i, { productName: e.target.value })}
                placeholder="Product Name *"
                className="flex-1 bg-transparent border-none outline-none text-sm font-medium text-gray-900 placeholder:text-gray-400"
              />
              <span className="text-sm font-semibold text-gray-700 tabular-nums whitespace-nowrap">
                ₹{subtotal.toFixed(2)}
              </span>
              <button
                onClick={() => toggle(i)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                {expanded[i] ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {items.length > 1 && (
                <button onClick={() => remove(i)} className="text-red-400 hover:text-red-600 transition-colors">
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* Expanded details */}
            {expanded[i] && (
              <div className="px-4 pb-4 pt-3 space-y-4">
                {/* Basic fields */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Description</label>
                  <textarea
                    value={item.description}
                    onChange={e => update(i, { description: e.target.value })}
                    rows={2}
                    placeholder="Add details about this item..."
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Quantity *</label>
                    <input
                      type="number" min={1}
                      value={item.quantity}
                      onChange={e => update(i, { quantity: parseInt(e.target.value) || 1 })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Unit Price (₹) *</label>
                    <input
                      type="number" min={0} step="0.01"
                      value={item.unitPrice}
                      onChange={e => update(i, { unitPrice: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Discount (₹)</label>
                    <input
                      type="number" min={0} step="0.01"
                      value={item.discount}
                      onChange={e => update(i, { discount: parseFloat(e.target.value) || 0 })}
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* 3D Print Attributes */}
                <div>
                  <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">3D Print Attributes</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Material</label>
                      <select
                        value={item.customAttributes.material || ''}
                        onChange={e => updateAttr(i, { material: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="">Select...</option>
                        {MATERIALS.map(m => <option key={m} value={m}>{m}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Color</label>
                      <select
                        value={item.customAttributes.color || ''}
                        onChange={e => updateAttr(i, { color: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="">Select...</option>
                        {COLORS.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Print Quality</label>
                      <select
                        value={item.customAttributes.printQuality || ''}
                        onChange={e => updateAttr(i, { printQuality: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="">Select...</option>
                        {QUALITY.map(q => <option key={q} value={q}>{q}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Infill %</label>
                      <select
                        value={item.customAttributes.infill || ''}
                        onChange={e => updateAttr(i, { infill: e.target.value })}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                      >
                        <option value="">Select...</option>
                        {INFILL.map(p => <option key={p} value={p}>{p}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Est. Weight (g)</label>
                      <input
                        type="text"
                        value={item.customAttributes.estimatedWeightG || ''}
                        onChange={e => updateAttr(i, { estimatedWeightG: e.target.value })}
                        placeholder="303.74"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">Est. Print Time</label>
                      <input
                        type="text"
                        value={item.customAttributes.estimatedTimeMins || ''}
                        onChange={e => updateAttr(i, { estimatedTimeMins: e.target.value })}
                        placeholder="5h 20m"
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-500 mb-1">Custom Specifications</label>
                    <textarea
                      value={item.customAttributes.customSpec || ''}
                      onChange={e => updateAttr(i, { customSpec: e.target.value })}
                      rows={2}
                      placeholder="Any other specifications..."
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                {/* Subtotal preview */}
                <div className="flex justify-end pt-2 border-t border-gray-100">
                  <div className="text-right text-sm space-y-1">
                    <div className="text-gray-500">
                      {item.quantity} × ₹{item.unitPrice.toFixed(2)}
                      {item.discount > 0 && ` − ₹${item.discount.toFixed(2)} discount`}
                    </div>
                    <div className="font-semibold text-gray-900">
                      Subtotal: ₹{subtotal.toFixed(2)}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}

      <button
        onClick={add}
        className="flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors"
      >
        <Plus className="w-4 h-4" />
        Add line item
      </button>
    </div>
  );
}
