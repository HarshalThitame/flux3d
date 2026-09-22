/* eslint-disable */
// @ts-nocheck
"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  User,
  Building2,
  Phone,
  Mail,
  Package,
  CreditCard,
  Truck,
  Printer,
  MessageCircle,
  Clock,
  ChevronDown,
  Copy,
  ExternalLink,
  ArrowLeft,
} from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";
import {
  OmsStatusBadges,
  ORDER_STATUS_CONFIG,
} from "@/components/admin/oms/OrderStatusBadges";
import PricingBreakdown from "@/components/admin/oms/PricingBreakdown";
import PaymentHistory from "@/components/admin/oms/PaymentHistory";
import ShipmentPanel from "@/components/admin/oms/ShipmentPanel";
import ProductionPanel from "@/components/admin/oms/ProductionPanel";
import CommunicationTimeline from "@/components/admin/oms/CommunicationTimeline";
import OrderTimeline from "@/components/admin/oms/OrderTimeline";
import TestimonialLinkPanel from "@/components/admin/TestimonialLinkPanel";
import Link from "next/link";

// Valid transitions from state machine (mirrors server)
const TRANSITIONS: Record<string, string[]> = {
  DRAFT: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["PAYMENT_PENDING", "PAYMENT_RECEIVED", "CANCELLED", "ON_HOLD"],
  PAYMENT_PENDING: [
    "PAYMENT_RECEIVED",
    "PAYMENT_FAILED",
    "CANCELLED",
    "ON_HOLD",
  ],
  PAYMENT_RECEIVED: ["IN_PRODUCTION", "CANCELLED", "ON_HOLD"],
  IN_PRODUCTION: ["QUALITY_CHECK", "PRINT_FAILED", "ON_HOLD"],
  QUALITY_CHECK: ["PACKED", "IN_PRODUCTION"],
  PRINT_FAILED: ["IN_PRODUCTION", "CANCELLED"],
  PACKED: ["SHIPPED", "ON_HOLD"],
  SHIPPED: ["OUT_FOR_DELIVERY", "DELIVERED"],
  OUT_FOR_DELIVERY: ["DELIVERED"],
  DELIVERED: ["RETURN_REQUESTED", "REFUNDED"],
  RETURN_REQUESTED: ["RETURNED", "DELIVERED"],
  RETURNED: ["REFUNDED"],
  ON_HOLD: [
    "CONFIRMED",
    "PAYMENT_PENDING",
    "PAYMENT_RECEIVED",
    "IN_PRODUCTION",
    "CANCELLED",
  ],
  CANCELLED: ["REFUNDED"],
  REFUNDED: [],
  PAYMENT_FAILED: ["PAYMENT_PENDING", "CANCELLED"],
};

function Section({ title, icon: Icon, children }: any) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="w-4 h-4 text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
          {title}
        </h2>
      </div>
      {children}
    </div>
  );
}

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | null;
  mono?: boolean;
}) {
  if (!value) return null;
  return (
    <div className="flex justify-between items-start gap-4 py-1.5 border-b border-gray-50 last:border-0">
      <span className="text-xs text-gray-400 shrink-0">{label}</span>
      <span
        className={`text-xs text-right ${mono ? "font-mono text-gray-700" : "font-medium text-gray-900"}`}
      >
        {value}
      </span>
    </div>
  );
}

export default function OMSOrderDetailPage() {
  const { orderId } = useParams() as { orderId: string };
  const router = useRouter();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [transitionLoading, setTransitionLoading] = useState(false);
  const [showTransitions, setShowTransitions] = useState(false);
  const [paymentLinkLoading, setPaymentLinkLoading] = useState(false);

  const fetchOrder = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/oms/orders/${orderId}`);
      const data = await res.json();
      if (res.ok) setOrder(data.order);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [orderId]);

  useEffect(() => {
    fetchOrder();
  }, [fetchOrder]);

  const changeStatus = async (newStatus: string) => {
    setTransitionLoading(true);
    try {
      const res = await fetch(`/api/admin/oms/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        await fetchOrder();
        setShowTransitions(false);
      } else {
        const d = await res.json();
        alert(d.error);
      }
    } finally {
      setTransitionLoading(false);
    }
  };

  const generatePaymentLink = async () => {
    setPaymentLinkLoading(true);
    try {
      const res = await fetch(
        `/api/admin/custom-orders/${orderId}/payment-link`,
        { method: "POST" },
      );
      const data = await res.json();
      if (res.ok) {
        navigator.clipboard.writeText(data.paymentLink);
        alert("Payment link copied to clipboard!");
      } else alert(data.error);
    } finally {
      setPaymentLinkLoading(false);
    }
  };

  if (loading) {
    return (
      <AdminShell>
        <div className="flex items-center justify-center h-64">
          <div className="w-8 h-8 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        </div>
      </AdminShell>
    );
  }

  if (!order) {
    return (
      <AdminShell>
        <div className="text-center py-20 text-gray-500">Order not found.</div>
      </AdminShell>
    );
  }

  const cust = order.customers;
  const allowedTransitions = TRANSITIONS[order.status] || [];
  const itemsSubtotal = Number(order.subtotal) || 0;
  const grandTotal = Number(order.total_amount) || 0;
  const amountPaid = Number(order.amount_paid) || 0;
  const amountDue = Number(order.amount_due) || 0;

  return (
    <AdminShell>
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <Link
                href="/admin/custom-orders"
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <ArrowLeft className="w-4 h-4" />
              </Link>
              <h1 className="text-2xl font-bold text-gray-900 font-mono tracking-tight">
                {order.order_number}
              </h1>
              <button
                onClick={() =>
                  navigator.clipboard.writeText(order.order_number)
                }
                className="text-gray-300 hover:text-gray-500 transition-colors"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>
            <OmsStatusBadges
              status={order.status}
              paymentStatus={order.payment_status}
              fulfillmentStatus={order.fulfillment_status}
            />
            <p className="text-xs text-gray-400">
              Order date:{" "}
              {new Date(order.order_date).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
              {" · "}
              Created:{" "}
              {new Date(order.created_at).toLocaleString("en-IN", {
                day: "numeric",
                month: "short",
                hour: "2-digit",
                minute: "2-digit",
              })}
            </p>
          </div>

          {/* Action toolbar */}
          <div className="flex flex-wrap gap-2 items-start shrink-0">
            {/* Status transition */}
            {allowedTransitions.length > 0 && (
              <div className="relative">
                <button
                  onClick={() => setShowTransitions((v) => !v)}
                  disabled={transitionLoading}
                  className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                >
                  {transitionLoading ? (
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      Update Status <ChevronDown className="w-4 h-4" />
                    </>
                  )}
                </button>
                {showTransitions && (
                  <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-50 min-w-[180px]">
                    {allowedTransitions.map((s) => {
                      const cfg = ORDER_STATUS_CONFIG[s];
                      return (
                        <button
                          key={s}
                          onClick={() => changeStatus(s)}
                          className="w-full text-left px-4 py-2.5 text-sm hover:bg-gray-50 transition-colors flex items-center gap-2"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${cfg?.color?.split(" ").find((c) => c.startsWith("bg-")) ?? "bg-gray-400"}`}
                          />
                          {cfg?.label ?? s}
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <button
              onClick={generatePaymentLink}
              disabled={paymentLinkLoading}
              className="px-3 py-2 bg-white border border-gray-200 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-50 disabled:opacity-50 transition-colors"
            >
              💳 Payment Link
            </button>
            <TestimonialLinkPanel
              apiEndpoint={`/api/admin/oms/orders/${orderId}/testimonial-link`}
            />
          </div>
        </div>

        {/* Main grid */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Left column: main content */}
          <div className="xl:col-span-2 space-y-6">
            {/* Customer */}
            <Section title="Customer" icon={User}>
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-full bg-indigo-100 flex items-center justify-center shrink-0">
                    {cust?.customer_type === "business" ? (
                      <Building2 className="w-4 h-4 text-indigo-600" />
                    ) : (
                      <User className="w-4 h-4 text-indigo-600" />
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="font-semibold text-gray-900">
                        {cust?.full_name || "—"}
                      </p>
                      {cust?.customer_type === "business" && (
                        <span className="text-[10px] bg-indigo-50 text-indigo-600 px-1.5 py-0.5 rounded font-semibold uppercase tracking-wide">
                          Business
                        </span>
                      )}
                    </div>
                    {cust?.company_name && (
                      <p className="text-sm text-gray-500">
                        {cust.company_name}
                      </p>
                    )}
                    {cust?.gstin && (
                      <p className="text-xs text-gray-400 font-mono">
                        GST: {cust.gstin}
                      </p>
                    )}
                    <div className="flex flex-wrap gap-3 mt-1">
                      {cust?.phone && (
                        <a
                          href={`tel:${cust.phone}`}
                          className="flex items-center gap-1 text-xs text-gray-600 hover:text-indigo-600"
                        >
                          <Phone className="w-3 h-3" />
                          {cust.phone}
                        </a>
                      )}
                      {cust?.email && (
                        <a
                          href={`mailto:${cust.email}`}
                          className="flex items-center gap-1 text-xs text-gray-600 hover:text-indigo-600"
                        >
                          <Mail className="w-3 h-3" />
                          {cust.email}
                        </a>
                      )}
                    </div>
                  </div>
                  {cust?.id && (
                    <Link
                      href={`/admin/customers/${cust.id}`}
                      className="text-xs text-indigo-600 hover:text-indigo-800 flex items-center gap-1 shrink-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                      View
                    </Link>
                  )}
                </div>
                {/* Order source */}
                <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-2 gap-2">
                  <InfoRow label="Source" value={order.source} />
                  {order.source_reference && (
                    <InfoRow label="Reference" value={order.source_reference} />
                  )}
                </div>
              </div>
            </Section>

            {/* Line Items */}
            <Section title="Line Items" icon={Package}>
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
                  <span className="text-xs text-gray-500">
                    {order.oms_order_items?.length || 0} items
                  </span>
                </div>
                {order.oms_order_items?.length === 0 ? (
                  <div className="px-4 py-8 text-center text-sm text-gray-400">
                    No items.
                  </div>
                ) : (
                  <ul className="divide-y divide-gray-50">
                    {order.oms_order_items?.map((item: any) => {
                      const attrs = item.custom_attributes || {};
                      return (
                        <li key={item.id} className="px-4 py-4">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1 min-w-0">
                              <p className="font-medium text-gray-900">
                                {item.product_name}
                              </p>
                              {item.description && (
                                <p className="text-xs text-gray-500 mt-0.5">
                                  {item.description}
                                </p>
                              )}
                              {/* 3D attributes */}
                              {Object.keys(attrs).length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-1.5">
                                  {attrs.material && (
                                    <span className="text-[10px] bg-violet-50 text-violet-700 px-2 py-0.5 rounded-full font-medium">
                                      {attrs.material}
                                    </span>
                                  )}
                                  {attrs.color && (
                                    <span className="text-[10px] bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full font-medium">
                                      {attrs.color}
                                    </span>
                                  )}
                                  {attrs.infill && (
                                    <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded-full font-medium">
                                      Infill {attrs.infill}
                                    </span>
                                  )}
                                  {attrs.printQuality && (
                                    <span className="text-[10px] bg-teal-50 text-teal-600 px-2 py-0.5 rounded-full font-medium">
                                      {attrs.printQuality}
                                    </span>
                                  )}
                                  {attrs.estimatedWeightG && (
                                    <span className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-medium">
                                      {attrs.estimatedWeightG}g
                                    </span>
                                  )}
                                  {attrs.estimatedTimeMins && (
                                    <span className="text-[10px] bg-yellow-50 text-yellow-600 px-2 py-0.5 rounded-full font-medium flex items-center gap-0.5">
                                      <Clock className="w-2.5 h-2.5" />
                                      {attrs.estimatedTimeMins}
                                    </span>
                                  )}
                                </div>
                              )}
                              {attrs.customSpec && (
                                <p className="text-xs text-gray-400 mt-1 italic">
                                  {attrs.customSpec}
                                </p>
                              )}
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-semibold text-gray-900">
                                ₹{Number(item.subtotal).toFixed(2)}
                              </p>
                              <p className="text-xs text-gray-400">
                                {item.quantity} × ₹
                                {Number(item.unit_price).toFixed(2)}
                              </p>
                              {item.discount > 0 && (
                                <p className="text-xs text-red-400">
                                  −₹{Number(item.discount).toFixed(2)} off
                                </p>
                              )}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
            </Section>

            {/* Shipment */}
            <Section title="Shipping" icon={Truck}>
              <ShipmentPanel
                orderId={orderId}
                shipments={order.oms_shipments || []}
                onUpdate={fetchOrder}
              />
            </Section>

            {/* Production */}
            <Section title="Production" icon={Printer}>
              <ProductionPanel
                orderId={orderId}
                jobs={order.oms_production_jobs || []}
                onUpdate={fetchOrder}
              />
            </Section>

            {/* Communication */}
            <Section title="Communication" icon={MessageCircle}>
              <CommunicationTimeline
                orderId={orderId}
                communications={order.oms_communications || []}
                onAdded={fetchOrder}
              />
            </Section>
          </div>

          {/* Right column: sidebar */}
          <div className="space-y-6">
            {/* Pricing */}
            <Section title="Pricing" icon={CreditCard}>
              <PricingBreakdown
                subtotal={itemsSubtotal}
                discount={Number(order.discount) || 0}
                shippingCost={Number(order.shipping_cost) || 0}
                tax={Number(order.tax) || 0}
                grandTotal={grandTotal}
                amountPaid={amountPaid}
                amountDue={amountDue}
                refundedAmount={Number(order.refunded_amount) || 0}
              />
            </Section>

            {/* Payment History */}
            <PaymentHistory
              orderId={orderId}
              transactions={order.oms_payment_transactions || []}
              onRecorded={fetchOrder}
            />

            {/* Notes */}
            {(order.customer_notes || order.internal_notes) && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                  <h3 className="text-sm font-semibold text-gray-700">Notes</h3>
                </div>
                <div className="px-4 py-3 space-y-3">
                  {order.customer_notes && (
                    <div>
                      <p className="text-xs font-semibold text-green-600 mb-1">
                        Customer Note
                      </p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {order.customer_notes}
                      </p>
                    </div>
                  )}
                  {order.internal_notes && (
                    <div>
                      <p className="text-xs font-semibold text-orange-600 mb-1">
                        🔒 Internal Note
                      </p>
                      <p className="text-sm text-gray-600 leading-relaxed">
                        {order.internal_notes}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Order Timeline */}
            <OrderTimeline logs={order.oms_audit_logs || []} />

            {/* Lifecycle timestamps */}
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100 bg-gray-50">
                <h3 className="text-sm font-semibold text-gray-700">
                  Timestamps
                </h3>
              </div>
              <div className="px-4 py-3">
                {[
                  ["Order Date", order.order_date],
                  ["Created At", order.created_at],
                  ["Confirmed", order.confirmed_at],
                  ["Payment Received", order.payment_received_at],
                  ["Production Started", order.production_started_at],
                  ["Production Done", order.production_completed_at],
                  ["Packed", order.packed_at],
                  ["Shipped", order.shipped_at],
                  ["Out for Delivery", order.out_for_delivery_at],
                  ["Delivered", order.delivered_at],
                  ["Cancelled", order.cancelled_at],
                ]
                  .filter(([, v]) => !!v)
                  .map(([l, v]) => (
                    <InfoRow
                      key={l as string}
                      label={l as string}
                      value={new Date(v as string).toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    />
                  ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminShell>
  );
}
