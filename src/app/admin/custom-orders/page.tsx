/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import DataTable from '@/components/admin/DataTable';
import { OmsStatusBadge } from '@/components/admin/oms/OrderStatusBadges';
import { Plus } from 'lucide-react';

export default function CustomOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/admin/oms/orders?limit=100')
      .then(r => r.json())
      .then(d => { setOrders(d.orders || []); })
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    {
      key: 'order_number',
      label: 'Order',
      sortable: true,
      render: (row: any) => (
        <span className="font-mono font-semibold text-gray-900 text-xs tracking-tight">
          {row.order_number}
        </span>
      ),
      sortValue: (row: any) => row.order_number,
    },
    {
      key: 'customer',
      label: 'Customer',
      sortable: true,
      render: (row: any) => (
        <div>
          <div className="font-medium text-gray-900 text-sm">{row.customers?.full_name || '—'}</div>
          <div className="text-gray-400 text-xs">{row.customers?.phone || row.customers?.email || ''}</div>
        </div>
      ),
      sortValue: (row: any) => row.customers?.full_name || '',
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      render: (row: any) => (
        <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
          {row.source?.replace(/_/g, ' ')}
        </span>
      ),
      sortValue: (row: any) => row.source,
    },
    {
      key: 'total_amount',
      label: 'Total',
      sortable: true,
      render: (row: any) => (
        <div>
          <div className="font-semibold text-gray-900">₹{Number(row.total_amount).toFixed(2)}</div>
          {Number(row.amount_due) > 0 && (
            <div className="text-xs text-red-500">Due: ₹{Number(row.amount_due).toFixed(2)}</div>
          )}
        </div>
      ),
      sortValue: (row: any) => Number(row.total_amount),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row: any) => (
        <div className="flex flex-col gap-1">
          <OmsStatusBadge value={row.status} type="order" />
          <OmsStatusBadge value={row.payment_status} type="payment" size="sm" />
        </div>
      ),
      sortValue: (row: any) => row.status,
    },
    {
      key: 'order_date',
      label: 'Order Date',
      sortable: true,
      render: (row: any) => (
        <div>
          <div className="text-sm text-gray-900">
            {new Date(row.order_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
          </div>
          <div className="text-xs text-gray-400">
            Created {new Date(row.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </div>
        </div>
      ),
      sortValue: (row: any) => new Date(row.order_date).getTime(),
    },
  ];

  return (
    <AdminShell>
      <DataTable
        title="Manual Orders"
        description="WhatsApp, walk-in, phone, and all offline orders."
        data={orders}
        columns={columns}
        searchPlaceholder="Search by order number, customer name, phone..."
        searchKeys={['order_number', 'source']}
        onRowClick={(row) => router.push(`/admin/custom-orders/${row.id}`)}
        action={
          <button
            onClick={() => router.push('/admin/custom-orders/create')}
            className="flex items-center gap-2 bg-black text-white px-4 py-2 rounded-lg hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Create Order</span>
          </button>
        }
        emptyTitle="No manual orders yet"
      />
    </AdminShell>
  );
}
