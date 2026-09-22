'use client';

import { ArrowUp, ArrowDown, Minus } from 'lucide-react';

interface PricingBreakdownProps {
  subtotal: number;
  discount: number;
  shippingCost: number;
  tax: number;
  grandTotal: number;
  amountPaid: number;
  amountDue: number;
  refundedAmount?: number;
  editable?: boolean;
  onChange?: (field: 'discount' | 'shippingCost' | 'tax', value: number) => void;
}

function Row({
  label,
  value,
  bold,
  positive,
  negative,
  indent,
  editable,
  onEdit,
}: {
  label: string;
  value: number;
  bold?: boolean;
  positive?: boolean;
  negative?: boolean;
  indent?: boolean;
  editable?: boolean;
  onEdit?: (v: number) => void;
}) {
  return (
    <div className={`flex items-center justify-between py-1.5 ${indent ? 'pl-4' : ''}`}>
      <span className={`text-sm ${bold ? 'font-semibold text-gray-900' : 'text-gray-500'}`}>{label}</span>
      {editable && onEdit ? (
        <div className="flex items-center gap-1">
          <span className="text-sm text-gray-400">{negative ? '−' : ''} ₹</span>
          <input
            type="number"
            min={0}
            step="0.01"
            defaultValue={value}
            onBlur={e => onEdit(parseFloat(e.target.value) || 0)}
            className="w-24 border border-gray-200 rounded px-2 py-0.5 text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
        </div>
      ) : (
        <span className={`text-sm tabular-nums ${bold ? 'font-bold' : ''} ${positive ? 'text-green-600' : negative ? 'text-red-500' : 'text-gray-900'}`}>
          {negative && value > 0 ? '−' : ''} ₹{Math.abs(value).toFixed(2)}
        </span>
      )}
    </div>
  );
}

export default function PricingBreakdown({
  subtotal, discount, shippingCost, tax,
  grandTotal, amountPaid, amountDue, refundedAmount = 0,
  editable, onChange,
}: PricingBreakdownProps) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-100">
        <h3 className="text-sm font-semibold text-gray-700">Pricing Breakdown</h3>
      </div>
      <div className="px-4 py-3 divide-y divide-gray-50">
        <Row label="Subtotal" value={subtotal} />
        {discount > 0 || editable ? (
          <Row
            label="Discount"
            value={discount}
            negative
            editable={editable}
            onEdit={v => onChange?.('discount', v)}
          />
        ) : null}
        <Row
          label="Shipping"
          value={shippingCost}
          editable={editable}
          onEdit={v => onChange?.('shippingCost', v)}
        />
        <Row
          label="Tax / GST"
          value={tax}
          editable={editable}
          onEdit={v => onChange?.('tax', v)}
        />
        <div className="pt-2 mt-1">
          <Row label="Grand Total" value={grandTotal} bold />
        </div>
        <div className="py-1">
          <Row label="Amount Paid" value={amountPaid} positive={amountPaid > 0} />
          {refundedAmount > 0 && (
            <Row label="Refunded" value={refundedAmount} negative />
          )}
        </div>
        <div className="pt-2 mt-1">
          <Row
            label={amountDue > 0 ? 'Amount Due' : 'Settled'}
            value={Math.abs(amountDue)}
            bold
            negative={amountDue > 0}
            positive={amountDue <= 0}
          />
        </div>
      </div>
    </div>
  );
}
