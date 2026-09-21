/* eslint-disable */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import AdminShell from '@/components/admin/AdminShell';
import DataTable from '@/components/admin/DataTable';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import StatusBadge from '@/components/admin/StatusBadge';
import { ShoppingBag, Plus } from 'lucide-react';

export default function CustomOrdersPage() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('custom_orders')
        .select('*')
        .order('created_at', { ascending: false });
        
      if (error) {
        console.error('Error fetching custom orders:', error);
      } else {
        setOrders(data || []);
      }
      setLoading(false);
    };
    
    fetchOrders();
  }, [supabase]);

  const columns = [
    {
      key: 'display_id',
      label: 'Order ID',
      sortable: true,
      render: (row: any) => <span className="font-medium text-gray-900">{row.display_id}</span>,
      sortValue: (row: any) => row.display_id,
    },
    {
      key: 'customer_name',
      label: 'Customer',
      sortable: true,
      render: (row: any) => (
        <div>
          <div className="font-medium text-gray-900">{row.customer_name}</div>
          <div className="text-gray-500 text-xs">{row.customer_email || row.customer_phone}</div>
        </div>
      ),
      sortValue: (row: any) => row.customer_name,
    },
    {
      key: 'total',
      label: 'Total',
      sortable: true,
      render: (row: any) => `₹${Number(row.total).toFixed(2)}`,
      sortValue: (row: any) => Number(row.total),
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row: any) => <StatusBadge status={row.status} />,
      sortValue: (row: any) => row.status,
    },
    {
      key: 'created_at',
      label: 'Date',
      sortable: true,
      render: (row: any) => new Date(row.created_at).toLocaleDateString(),
      sortValue: (row: any) => new Date(row.created_at).getTime(),
    },
  ];

  return (
    <AdminShell title="Custom Orders" description="Manage manual custom quotes and orders">
      <DataTable
        title="Custom Orders"
        description="A list of all manual custom orders created in the system."
        data={orders}
        columns={columns}
        searchPlaceholder="Search custom orders..."
        searchKeys={['display_id', 'customer_name', 'customer_email', 'customer_phone']}
        onRowClick={(row) => router.push(`/admin/custom-orders/${row.id}`)}
        action={
          <button
            onClick={() => router.push('/admin/custom-orders/create')}
            className="flex items-center space-x-2 bg-black text-white px-4 py-2 rounded hover:bg-gray-800 transition-colors text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Create Order</span>
          </button>
        }
        emptyTitle="No custom orders found"
      />
    </AdminShell>
  );
}
