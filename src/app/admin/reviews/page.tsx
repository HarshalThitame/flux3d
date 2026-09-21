'use client';

import React, { useEffect, useState } from 'react';
import AdminShell from '@/components/admin/AdminShell';
import DataTable from '@/components/admin/DataTable';
import StatusBadge from '@/components/admin/StatusBadge';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const fetchReviews = async () => {
      const { data, error } = await supabase
        .from('reviews')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching reviews:', error);
      } else {
        setReviews(data || []);
      }
      setLoading(false);
    };

    fetchReviews();
  }, [supabase]);

  const updateStatus = async (id: string, newStatus: string) => {
    // Optimistic UI update
    setReviews(reviews.map(r => r.id === id ? { ...r, status: newStatus } : r));
    
    // Update Supabase
    await supabase.from('reviews').update({ status: newStatus }).eq('id', id);
  };

  const columns = [
    {
      key: 'customer',
      label: 'Customer',
      sortable: true,
      render: (row: any) => (
        <div>
          <div className="font-medium text-gray-900">{row.customer_name || 'Anonymous'}</div>
          <div className="text-gray-500 text-xs mt-1 capitalize border border-gray-200 inline-block px-2 py-0.5 rounded bg-gray-50">
            {row.order_type === 'custom_order' ? 'Custom Quote' : 'Store'}
          </div>
        </div>
      ),
      sortValue: (row: any) => row.customer_name,
    },
    {
      key: 'rating',
      label: 'Rating',
      sortable: true,
      render: (row: any) => (
        <span className="flex text-yellow-400">
          {Array.from({ length: 5 }).map((_, i) => (
            <svg key={i} className={`w-4 h-4 ${i < row.rating ? 'fill-current' : 'text-gray-200'}`} viewBox="0 0 20 20">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
            </svg>
          ))}
        </span>
      ),
      sortValue: (row: any) => row.rating,
    },
    {
      key: 'body',
      label: 'Review',
      render: (row: any) => <div className="text-sm text-gray-500 max-w-xs truncate">{row.body}</div>,
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (row: any) => <StatusBadge status={row.status} />,
      sortValue: (row: any) => row.status,
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (row: any) => (
        <div className="space-x-3 text-sm">
          {row.status !== 'approved' && (
            <button onClick={(e) => { e.stopPropagation(); updateStatus(row.id, 'approved'); }} className="text-green-600 font-medium hover:text-green-800">Approve</button>
          )}
          {row.status !== 'rejected' && (
            <button onClick={(e) => { e.stopPropagation(); updateStatus(row.id, 'rejected'); }} className="text-red-600 font-medium hover:text-red-800">Reject</button>
          )}
        </div>
      ),
    }
  ];

  return (
    <AdminShell title="Review Moderation" description="Approve or reject customer reviews for the landing page">
      <DataTable
        title="Reviews"
        description="Manage the visibility of all unified reviews."
        data={reviews}
        columns={columns}
        searchPlaceholder="Search reviews..."
        searchKeys={['customer_name', 'body', 'title']}
        emptyTitle="No reviews yet"
        filters={[
          {
            key: 'status',
            label: 'Status',
            options: [
              { label: 'All', value: 'all' },
              { label: 'Pending', value: 'pending' },
              { label: 'Approved', value: 'approved' },
              { label: 'Rejected', value: 'rejected' }
            ],
            getValue: (row: any) => row.status
          }
        ]}
      />
    </AdminShell>
  );
}
