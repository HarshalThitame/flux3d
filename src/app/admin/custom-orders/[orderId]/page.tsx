/* eslint-disable */
// @ts-nocheck
/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { getSupabaseBrowserClient } from '@/lib/supabase/client';
import AdminShell from '@/components/admin/AdminShell';

export default function CustomOrderDashboard() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<any>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [reviewTokenUrl, setReviewTokenUrl] = useState('');

  const supabase = getSupabaseBrowserClient();

  useEffect(() => {
    const fetchOrder = async () => {
      const { data, error } = await supabase
        .from('custom_orders')
        .select('*, custom_order_items(*)')
        .eq('id', orderId)
        .single();
        
      if (error) {
        console.error('Error fetching order:', error);
      } else {
        setOrder(data);
      }
    };
    if (orderId) fetchOrder();
  }, [orderId, supabase]);

  const generatePaymentLink = async () => {
    setLoadingLink(true);
    try {
      const res = await fetch(`/api/admin/custom-orders/${orderId}/payment-link`, { method: 'POST' });
      const data = await res.json();
      if (res.ok) {
        alert(`Payment Link: ${data.paymentLink}`);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingLink(false);
    }
  };

  const generateReviewLink = async () => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/review-link`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderType: 'custom_order' })
      });
      const data = await res.json();
      if (res.ok) {
        setReviewTokenUrl(data.url);
      } else {
        alert(data.error);
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <AdminShell 
      title={order ? `Order ${order.display_id}` : 'Loading Order...'} 
      description={order ? `Customer: ${order.customer_name}` : ''}
      backLink="/admin/custom-orders"
    >
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 bg-white p-6 rounded-xl shadow-sm border border-gray-100">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-1">Order Actions</h2>
          <p className="text-sm text-gray-500">Generate links for payment and verified reviews.</p>
        </div>
        <div className="flex space-x-3 mt-4 md:mt-0">
          <button 
            onClick={generatePaymentLink} 
            disabled={loadingLink || !order} 
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium shadow-sm hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {loadingLink ? 'Generating...' : 'Generate Payment Link'}
          </button>
          <button 
            onClick={generateReviewLink} 
            disabled={!order}
            className="px-4 py-2 bg-black text-white rounded-lg text-sm font-medium shadow-sm hover:bg-gray-800 disabled:opacity-50 transition-colors"
          >
            Request a Review
          </button>
        </div>
      </div>
      
      {reviewTokenUrl && (
        <div className="mb-8 p-5 bg-green-50 border border-green-200 rounded-xl flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-green-900 mb-1">Review Link Generated</p>
            <p className="text-xs text-green-700">Send this single-use link to the customer via WhatsApp or Email.</p>
          </div>
          <div className="flex items-center space-x-2">
            <input type="text" readOnly value={reviewTokenUrl} className="w-64 p-2 border border-green-200 rounded-lg text-sm bg-white text-gray-600 focus:outline-none" />
            <button onClick={() => navigator.clipboard.writeText(reviewTokenUrl)} className="px-3 py-2 bg-green-100 text-green-800 font-medium rounded-lg text-sm hover:bg-green-200 transition-colors">Copy</button>
          </div>
        </div>
      )}

      {order ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900">Line Items</h3>
                <span className="text-sm text-gray-500">{order.custom_order_items?.length || 0} items</span>
              </div>
              <ul className="divide-y divide-gray-100">
                {order.custom_order_items?.map((item: any) => (
                  <li key={item.id} className="p-6 flex justify-between hover:bg-gray-50 transition-colors">
                    <div>
                      <p className="font-medium text-gray-900">{item.title}</p>
                      {item.description && <p className="text-sm text-gray-500 mt-1">{item.description}</p>}
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">₹{Number(item.total_price).toFixed(2)}</p>
                      <p className="text-sm text-gray-500">{item.quantity} x ₹{Number(item.unit_price).toFixed(2)}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
          
          <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Customer Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Status</span><span className="font-medium capitalize">{order.status}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Name</span><span className="font-medium">{order.customer_name}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Email</span><span className="font-medium">{order.customer_email || '—'}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Phone</span><span className="font-medium">{order.customer_phone || '—'}</span></div>
              </div>
            </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
              <h3 className="font-semibold text-gray-900 mb-4">Payment Summary</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-500">Subtotal</span><span>₹{Number(order.subtotal).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Tax</span><span>₹{Number(order.tax).toFixed(2)}</span></div>
                <div className="flex justify-between"><span className="text-gray-500">Shipping</span><span>₹{Number(order.shipping_fee).toFixed(2)}</span></div>
                <div className="pt-3 mt-3 border-t border-gray-100 flex justify-between items-center">
                  <span className="font-semibold text-gray-900">Total</span>
                  <span className="font-bold text-lg text-indigo-600">₹{Number(order.total).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-12 text-center text-gray-500">
          Loading order details...
        </div>
      )}
    </AdminShell>
  );
}
