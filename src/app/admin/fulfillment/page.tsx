/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function FulfillmentDashboard() {
  const [shipments, setShipments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    fetchShipments();
  }, [supabase]);

  const fetchShipments = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('oms_shipments')
      .select('*, oms_orders(order_number, fulfillment_status)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setShipments(data);
    }
    setLoading(false);
  };

  const markAsShipped = async (id: string, orderId: string) => {
    // Optimistic
    setShipments(shipments.map(s => s.id === id ? { ...s, actual_ship_date: new Date().toISOString(), oms_orders: { ...s.oms_orders, fulfillment_status: 'SHIPPED' } } : s));
    
    // Update shipment timestamp
    await supabase.from('oms_shipments').update({ actual_ship_date: new Date().toISOString() }).eq('id', id);
    // Update order status
    await supabase.from('oms_orders').update({ fulfillment_status: 'SHIPPED', status: 'SHIPPED' }).eq('id', orderId);
  };

  const columns = [
    {
      key: 'order',
      label: 'Order #',
      render: (row: any) => <span className="font-medium">{row.oms_orders?.order_number || 'Unknown'}</span>,
    },
    {
      key: 'customer',
      label: 'Shipping To',
      render: (row: any) => (
        <div>
          <div className="font-medium text-gray-900">{row.shipping_name}</div>
          <div className="text-gray-500 text-xs">{row.city}, {row.state}</div>
        </div>
      ),
    },
    {
      key: 'logistics',
      label: 'Logistics',
      render: (row: any) => (
        <div>
          <div className="text-sm text-gray-900">{row.courier_name || 'Pending Courier'}</div>
          <div className="text-gray-500 text-xs font-mono">{row.awb_number || 'No AWB'}</div>
        </div>
      ),
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: any) => <StatusBadge status={row.oms_orders?.fulfillment_status || 'NOT_SHIPPED'} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: any) => (
        <div className="flex space-x-2 text-sm">
          {row.oms_orders?.fulfillment_status !== 'SHIPPED' && (
             <button onClick={() => markAsShipped(row.id, row.order_id)} className="text-indigo-600 font-medium">Mark Shipped</button>
          )}
        </div>
      ),
    }
  ];

  return (
    <AdminShell title="Fulfillment Dashboard" description="Manage shipping logistics, AWBs, and dispatch tracking.">
      <DataTable
        title="Active Shipments"
        description="Shipments generated from packed orders."
        data={shipments}
        columns={columns}
        searchPlaceholder="Search by order or AWB..."
        searchKeys={['shipping_name', 'awb_number', 'city']}
        emptyTitle="No shipments pending"
      />
    </AdminShell>
  );
}
