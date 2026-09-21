'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';

export default function CustomOrderDashboard() {
  const params = useParams();
  const orderId = params.orderId as string;
  const [order, setOrder] = useState<any>(null);
  const [loadingLink, setLoadingLink] = useState(false);
  const [reviewTokenUrl, setReviewTokenUrl] = useState('');

  useEffect(() => {
    // Fetch order details (Mocked for UI purposes, would normally fetch from API)
    // Here we'll simulate fetching from a GET route which we haven't written yet.
    // We can use supabase client directly if initialized properly, but let's assume we do it here.
    const fetchOrder = async () => {
       // Mock for now or implement GET /api/admin/custom-orders/[orderId]
    };
    fetchOrder();
  }, [orderId]);

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
    <div className="max-w-4xl mx-auto py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">Manage Custom Order</h1>
        <div className="space-x-4">
          <button onClick={generatePaymentLink} disabled={loadingLink} className="px-4 py-2 bg-indigo-600 text-white rounded hover:bg-indigo-700">
            {loadingLink ? 'Generating...' : 'Generate Payment Link'}
          </button>
          <button onClick={generateReviewLink} className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700">
            Request a Review
          </button>
        </div>
      </div>
      
      {reviewTokenUrl && (
        <div className="mb-8 p-4 bg-green-50 border border-green-200 rounded">
          <p className="text-sm font-semibold text-green-800 mb-2">Review Link Generated:</p>
          <div className="flex items-center space-x-2">
            <input type="text" readOnly value={reviewTokenUrl} className="flex-1 p-2 border rounded text-sm bg-white" />
            <button onClick={() => navigator.clipboard.writeText(reviewTokenUrl)} className="px-3 py-2 bg-gray-200 rounded text-sm hover:bg-gray-300">Copy</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl shadow p-6">
        <p className="text-gray-500 mb-4">Order ID: {orderId}</p>
        <p className="mb-4">This is the dashboard where admins can manage the order status, track razorpay payments, and dispatch review tokens.</p>
        {/* Further order details and tracking would go here */}
      </div>
    </div>
  );
}
