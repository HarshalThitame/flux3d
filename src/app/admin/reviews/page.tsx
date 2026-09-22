"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Loader2, Star, X } from "lucide-react";
import AdminShell from "@/components/admin/AdminShell";

type Review = {
  id: string;
  order_type: string;
  order_id: string;
  customer_name: string | null;
  customer_email: string | null;
  rating: number;
  title: string | null;
  body: string | null;
  status: "pending" | "approved" | "rejected";
  is_verified_purchase: boolean;
  created_at: string;
};

type Tab = "all" | "pending" | "approved" | "rejected";

type OrderTypeFilter = "all" | "shop" | "custom_order";

function StarDisplay({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`}
        />
      ))}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const cls =
    status === "approved"
      ? "bg-green-50 text-green-700 border-green-200"
      : status === "rejected"
        ? "bg-red-50 text-red-700 border-red-200"
        : "bg-amber-50 text-amber-700 border-amber-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${cls}`}
    >
      {status}
    </span>
  );
}

function OrderTypeBadge({ type }: { type: string }) {
  const label =
    type === "shop"
      ? "3D Shop"
      : type === "custom_order"
        ? "Custom Order"
        : "Instant Quote";
  const cls =
    type === "shop"
      ? "bg-purple-50 text-purple-700 border-purple-200"
      : type === "custom_order"
        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
        : "bg-blue-50 text-blue-700 border-blue-200";
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${cls}`}
    >
      {label}
    </span>
  );
}

function orderDetailPath(review: Review): string {
  if (review.order_type === "shop")
    return `/admin/3d-shop/orders/${review.order_id}`;
  if (review.order_type === "custom_order")
    return `/admin/custom-orders/${review.order_id}`;
  return `/admin/orders/${review.order_id}`;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>("all");
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const res = await fetch("/api/admin/testimonials");
      const data = (await res.json()) as { reviews?: Review[] };
      setReviews(data.reviews ?? []);
      setLoading(false);
    };
    void load();
  }, []);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    setUpdating(id);
    // Optimistic update
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    await fetch("/api/admin/testimonials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setUpdating(null);
  };

  // ── Derived stats ──
  const pending = reviews.filter((r) => r.status === "pending").length;
  const approved = reviews.filter((r) => r.status === "approved").length;
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : "—";

  // ── Filtered list ──
  const filtered = reviews.filter((r) => {
    if (tab !== "all" && r.status !== tab) return false;
    if (typeFilter !== "all" && r.order_type !== typeFilter) return false;
    return true;
  });

  // ── Tab counts ──
  const tabCounts: Record<Tab, number> = {
    all: reviews.length,
    pending: reviews.filter((r) => r.status === "pending").length,
    approved: reviews.filter((r) => r.status === "approved").length,
    rejected: reviews.filter((r) => r.status === "rejected").length,
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* ── Page heading ── */}
        <div>
          <h1 className="text-2xl font-bold text-[#0F1B3D]">
            Testimonial Moderation
          </h1>
          <p className="mt-1 text-sm text-[#6F7192]">
            Approve or reject customer testimonials for the landing page.
          </p>
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-amber-600">
              Pending Review
            </p>
            <p className="mt-1 text-3xl font-bold text-amber-900">{pending}</p>
          </div>
          <div className="rounded-xl border border-green-200 bg-green-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-green-600">
              Published
            </p>
            <p className="mt-1 text-3xl font-bold text-green-900">{approved}</p>
          </div>
          <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-indigo-600">
              Avg. Rating
            </p>
            <p className="mt-1 text-3xl font-bold text-indigo-900">
              ★ {avgRating}
            </p>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-4">
          {/* Tab pills */}
          <div className="flex rounded-xl border border-gray-200 bg-gray-50 p-1 gap-1">
            {(["all", "pending", "approved", "rejected"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold capitalize transition ${
                  tab === t
                    ? "bg-white shadow-sm text-gray-900"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t} <span className="ml-1 text-gray-400">({tabCounts[t]})</span>
              </button>
            ))}
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as OrderTypeFilter)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none"
          >
            <option value="all">All Types</option>
            <option value="shop">3D Shop</option>
            <option value="custom_order">Custom Order</option>
          </select>
        </div>

        {/* ── Review cards ── */}
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-gray-200 py-16 text-center">
            <Star className="mx-auto mb-3 h-10 w-10 text-gray-200" />
            <p className="font-medium text-gray-500">
              No testimonials here yet.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((review) => {
              const expanded = expandedId === review.id;
              return (
                <div
                  key={review.id}
                  className="rounded-xl border border-gray-200 bg-white shadow-sm transition hover:shadow-md"
                >
                  {/* Row header */}
                  <div className="flex items-start gap-4 p-4">
                    {/* Avatar */}
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white">
                      {(review.customer_name ?? "?")[0].toUpperCase()}
                    </div>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-semibold text-gray-900">
                          {review.customer_name ?? "Anonymous"}
                        </p>
                        <StatusBadge status={review.status} />
                        <OrderTypeBadge type={review.order_type} />
                        <span className="text-xs text-gray-400">
                          {formatRelative(review.created_at)}
                        </span>
                      </div>
                      {review.customer_email && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          {review.customer_email}
                        </p>
                      )}
                      <StarDisplay rating={review.rating} />
                      <p
                        className={`mt-1 text-sm text-gray-600 ${expanded ? "" : "line-clamp-2"}`}
                      >
                        {review.body ?? "—"}
                      </p>
                      {review.body && review.body.length > 120 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(expanded ? null : review.id)
                          }
                          className="mt-1 text-xs text-indigo-500 hover:text-indigo-700"
                        >
                          {expanded ? "Show less" : "Read more"}
                        </button>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 items-center gap-2">
                      <Link
                        href={orderDetailPath(review)}
                        target="_blank"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-indigo-200 hover:text-indigo-600"
                        title="View order"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Link>

                      {review.status !== "approved" && (
                        <button
                          type="button"
                          onClick={() =>
                            void updateStatus(review.id, "approved")
                          }
                          disabled={updating === review.id}
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-green-200 bg-green-50 px-2.5 text-xs font-semibold text-green-700 transition hover:bg-green-100 disabled:opacity-50"
                        >
                          {updating === review.id ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Check className="h-3.5 w-3.5" />
                          )}
                          Approve
                        </button>
                      )}
                      {review.status !== "rejected" && (
                        <button
                          type="button"
                          onClick={() =>
                            void updateStatus(review.id, "rejected")
                          }
                          disabled={updating === review.id}
                          className="flex h-8 items-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-2.5 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                        >
                          <X className="h-3.5 w-3.5" />
                          Reject
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
