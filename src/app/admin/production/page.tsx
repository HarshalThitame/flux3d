/* eslint-disable */
// @ts-nocheck
'use client';

import React, { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function ProductionDashboard() {
  const [jobs, setJobs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    fetchJobs();
  }, [supabase]);

  const fetchJobs = async () => {
    setLoading(true);
    // Fetch jobs along with their associated order and order items
    const { data, error } = await supabase
      .from('oms_production_jobs')
      .select('*, oms_orders(order_number), oms_order_items(product_name)')
      .order('created_at', { ascending: false });

    if (!error && data) {
      setJobs(data);
    }
    setLoading(false);
  };

  const updateJobStatus = async (id: string, newStatus: string) => {
    setJobs(jobs.map(j => j.id === id ? { ...j, status: newStatus } : j));
    
    const updates: any = { status: newStatus };
    if (newStatus === 'PRINTING') updates.production_started_at = new Date().toISOString();
    if (newStatus === 'COMPLETED' || newStatus === 'FAILED') updates.production_completed_at = new Date().toISOString();
    
    await supabase.from('oms_production_jobs').update(updates).eq('id', id);
  };

  const columns = [
    {
      key: 'order',
      label: 'Order #',
      render: (row: any) => <span className="font-medium">{row.oms_orders?.order_number || 'Unknown'}</span>,
    },
    {
      key: 'item',
      label: 'Product',
      render: (row: any) => <span className="text-gray-900">{row.oms_order_items?.product_name || 'Item'}</span>,
    },
    {
      key: 'printer',
      label: 'Printer',
      render: (row: any) => <span className="text-gray-500 text-sm">{row.printer_name || 'Unassigned'}</span>,
    },
    {
      key: 'status',
      label: 'Status',
      render: (row: any) => <StatusBadge status={row.status} />,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: any) => (
        <div className="flex space-x-2 text-sm">
          {row.status === 'QUEUED' && (
            <button onClick={() => updateJobStatus(row.id, 'PRINTING')} className="text-blue-600 font-medium">Start Print</button>
          )}
          {row.status === 'PRINTING' && (
            <>
              <button onClick={() => updateJobStatus(row.id, 'COMPLETED')} className="text-green-600 font-medium">Complete</button>
              <button onClick={() => updateJobStatus(row.id, 'FAILED')} className="text-red-600 font-medium">Mark Failed</button>
            </>
          )}
        </div>
      ),
    }
  ];

  return (
    <AdminShell title="Production Dashboard" description="Manage 3D print jobs, assign printers, and track failures.">
      <DataTable
        title="Active Print Jobs"
        description="Monitor farm utilization and production yields."
        data={jobs}
        columns={columns}
        searchPlaceholder="Search jobs by order..."
        searchKeys={['printer_name', 'status']}
        emptyTitle="No production jobs found"
      />
    </AdminShell>
  );
}
