'use client';

import { cn } from '@/lib/utils';

const ORDER_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  DRAFT:             { label: 'Draft',             color: 'bg-gray-100 text-gray-600' },
  CONFIRMED:         { label: 'Confirmed',          color: 'bg-blue-100 text-blue-700' },
  PAYMENT_PENDING:   { label: 'Payment Pending',    color: 'bg-yellow-100 text-yellow-700' },
  PAYMENT_RECEIVED:  { label: 'Payment Received',   color: 'bg-green-100 text-green-700' },
  IN_PRODUCTION:     { label: 'In Production',      color: 'bg-violet-100 text-violet-700' },
  QUALITY_CHECK:     { label: 'Quality Check',      color: 'bg-purple-100 text-purple-700' },
  PRINT_FAILED:      { label: 'Print Failed',       color: 'bg-red-100 text-red-700' },
  PACKED:            { label: 'Packed',             color: 'bg-teal-100 text-teal-700' },
  SHIPPED:           { label: 'Shipped',            color: 'bg-cyan-100 text-cyan-700' },
  OUT_FOR_DELIVERY:  { label: 'Out for Delivery',   color: 'bg-sky-100 text-sky-700' },
  DELIVERED:         { label: 'Delivered',          color: 'bg-emerald-100 text-emerald-700' },
  CANCELLED:         { label: 'Cancelled',          color: 'bg-red-100 text-red-600' },
  ON_HOLD:           { label: 'On Hold',            color: 'bg-orange-100 text-orange-700' },
  PAYMENT_FAILED:    { label: 'Payment Failed',     color: 'bg-red-100 text-red-700' },
  RETURN_REQUESTED:  { label: 'Return Requested',   color: 'bg-pink-100 text-pink-700' },
  RETURNED:          { label: 'Returned',           color: 'bg-rose-100 text-rose-700' },
  REFUNDED:          { label: 'Refunded',           color: 'bg-gray-100 text-gray-600' },
};

const PAYMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  UNPAID:             { label: 'Unpaid',             color: 'bg-red-50 text-red-600 ring-1 ring-red-200' },
  PARTIALLY_PAID:     { label: 'Partial',            color: 'bg-yellow-50 text-yellow-700 ring-1 ring-yellow-200' },
  PAID:               { label: 'Paid',               color: 'bg-green-50 text-green-700 ring-1 ring-green-200' },
  REFUNDED:           { label: 'Refunded',           color: 'bg-gray-50 text-gray-600 ring-1 ring-gray-200' },
  PARTIALLY_REFUNDED: { label: 'Partial Refund',     color: 'bg-orange-50 text-orange-700 ring-1 ring-orange-200' },
  FAILED:             { label: 'Failed',             color: 'bg-red-50 text-red-700 ring-1 ring-red-200' },
};

const FULFILLMENT_STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  NOT_SHIPPED:      { label: 'Not Shipped',       color: 'bg-gray-100 text-gray-500' },
  IN_PRODUCTION:    { label: 'In Production',     color: 'bg-violet-100 text-violet-700' },
  PACKED:           { label: 'Packed',            color: 'bg-teal-100 text-teal-700' },
  SHIPPED:          { label: 'Shipped',           color: 'bg-cyan-100 text-cyan-700' },
  OUT_FOR_DELIVERY: { label: 'Out for Delivery',  color: 'bg-sky-100 text-sky-700' },
  DELIVERED:        { label: 'Delivered',         color: 'bg-emerald-100 text-emerald-700' },
  RETURNED:         { label: 'Returned',          color: 'bg-rose-100 text-rose-700' },
};

interface BadgeProps {
  value: string;
  type: 'order' | 'payment' | 'fulfillment';
  size?: 'sm' | 'md';
}

export function OmsStatusBadge({ value, type, size = 'md' }: BadgeProps) {
  const config =
    type === 'order' ? ORDER_STATUS_CONFIG[value] :
    type === 'payment' ? PAYMENT_STATUS_CONFIG[value] :
    FULFILLMENT_STATUS_CONFIG[value];

  const label = config?.label ?? value;
  const color = config?.color ?? 'bg-gray-100 text-gray-600';

  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full font-medium',
        size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs',
        color
      )}
    >
      {label}
    </span>
  );
}

// Three-badge row for order detail header
export function OmsStatusBadges({
  status,
  paymentStatus,
  fulfillmentStatus,
}: {
  status: string;
  paymentStatus: string;
  fulfillmentStatus: string;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <OmsStatusBadge value={status} type="order" />
      <OmsStatusBadge value={paymentStatus} type="payment" size="sm" />
      <OmsStatusBadge value={fulfillmentStatus} type="fulfillment" size="sm" />
    </div>
  );
}

export { ORDER_STATUS_CONFIG, PAYMENT_STATUS_CONFIG, FULFILLMENT_STATUS_CONFIG };
