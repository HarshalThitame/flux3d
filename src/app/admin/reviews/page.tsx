"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  Check,
  ExternalLink,
  Loader2,
  Star,
  X,
  MessageSquareQuote,
  TrendingUp,
  Clock,
} from "lucide-react";
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

const AVATAR_GRADIENTS = [
  "from-violet-500 to-purple-600",
  "from-blue-500 to-cyan-500",
  "from-emerald-500 to-teal-600",
  "from-orange-500 to-amber-500",
  "from-rose-500 to-pink-600",
  "from-indigo-500 to-blue-600",
];

function getGradient(name: string) {
  const code = name.charCodeAt(0) % AVATAR_GRADIENTS.length;
  return AVATAR_GRADIENTS[code];
}

function StarRow({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={`h-3.5 w-3.5 ${i <= rating ? "fill-amber-400 text-amber-400" : "fill-gray-200 text-gray-200"}`}
        />
      ))}
      <span className="ml-1 text-xs font-medium text-gray-500">{rating}/5</span>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const styles = {
    approved:
      "bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100",
    rejected: "bg-red-50 text-red-700 border-red-200 ring-red-100",
    pending: "bg-amber-50 text-amber-700 border-amber-200 ring-amber-100",
  };
  const icons = {
    approved: "✓",
    rejected: "✕",
    pending: "◷",
  };
  const s = status as "approved" | "rejected" | "pending";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-widest ${styles[s]}`}
    >
      {icons[s]} {status}
    </span>
  );
}

function TypeChip({ type }: { type: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    shop: {
      label: "3D Shop",
      cls: "bg-purple-50 text-purple-700 border-purple-200",
    },
    custom_order: {
      label: "Custom Order",
      cls: "bg-indigo-50 text-indigo-700 border-indigo-200",
    },
    custom: {
      label: "Instant Quote",
      cls: "bg-blue-50 text-blue-700 border-blue-200",
    },
  };
  const config = map[type] ?? {
    label: type,
    cls: "bg-gray-50 text-gray-600 border-gray-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-semibold ${config.cls}`}
    >
      {config.label}
    </span>
  );
}

function orderPath(r: Review) {
  if (r.order_type === "shop") return `/admin/3d-shop/orders/${r.order_id}`;
  if (r.order_type === "custom_order")
    return `/admin/custom-orders/${r.order_id}`;
  return `/admin/orders/${r.order_id}`;
}

function timeAgo(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function AdminReviewsPage() {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>("pending");
  const [typeFilter, setTypeFilter] = useState<OrderTypeFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/admin/testimonials");
        if (!res.ok) throw new Error(`Server error ${res.status}`);
        const data = (await res.json()) as { reviews?: Review[] };
        setReviews(data.reviews ?? []);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load");
      } finally {
        setLoading(false);
      }
    };
    void load();
  }, []);

  const updateStatus = async (id: string, status: "approved" | "rejected") => {
    setUpdating(id);
    setReviews((prev) => prev.map((r) => (r.id === id ? { ...r, status } : r)));
    await fetch("/api/admin/testimonials", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    setUpdating(null);
  };

  const pending = reviews.filter((r) => r.status === "pending").length;
  const approved = reviews.filter((r) => r.status === "approved").length;
  const avgRating =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : "—";

  const filtered = reviews.filter((r) => {
    if (tab !== "all" && r.status !== tab) return false;
    if (typeFilter !== "all" && r.order_type !== typeFilter) return false;
    return true;
  });

  const tabCounts: Record<Tab, number> = {
    all: reviews.length,
    pending: reviews.filter((r) => r.status === "pending").length,
    approved: reviews.filter((r) => r.status === "approved").length,
    rejected: reviews.filter((r) => r.status === "rejected").length,
  };

  return (
    <AdminShell>
      <div className="space-y-6">
        {/* ── Header ── */}
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <MessageSquareQuote className="h-6 w-6 text-indigo-600" />
              <h1 className="text-2xl font-bold text-[#0F1B3D]">
                Testimonials
              </h1>
            </div>
            <p className="mt-1 text-sm text-[#6F7192]">
              Approve or reject customer testimonials before they appear on the
              landing page.
            </p>
          </div>
          {pending > 0 && (
            <div className="flex items-center gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-2">
              <Clock className="h-4 w-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-700">
                {pending} awaiting review
              </span>
            </div>
          )}
        </div>

        {/* ── Stats ── */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-amber-100 bg-gradient-to-br from-amber-50 to-orange-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-amber-600">
                Pending
              </p>
              <Clock className="h-4 w-4 text-amber-400" />
            </div>
            <p className="mt-2 text-4xl font-extrabold text-amber-900">
              {pending}
            </p>
          </div>
          <div className="rounded-2xl border border-emerald-100 bg-gradient-to-br from-emerald-50 to-teal-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-emerald-600">
                Published
              </p>
              <Check className="h-4 w-4 text-emerald-400" />
            </div>
            <p className="mt-2 text-4xl font-extrabold text-emerald-900">
              {approved}
            </p>
          </div>
          <div className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-purple-50 p-5 shadow-sm">
            <div className="flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
                Avg Rating
              </p>
              <TrendingUp className="h-4 w-4 text-indigo-400" />
            </div>
            <p className="mt-2 text-4xl font-extrabold text-indigo-900">
              ★ {avgRating}
            </p>
          </div>
        </div>

        {/* ── Filters ── */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Tab pills */}
          <div className="flex gap-1 rounded-xl border border-gray-200 bg-gray-100 p-1">
            {(["all", "pending", "approved", "rejected"] as Tab[]).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold capitalize transition-all ${
                  tab === t
                    ? "bg-white text-gray-900 shadow-sm"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t}
                {tabCounts[t] > 0 && (
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      tab === t
                        ? "bg-indigo-100 text-indigo-700"
                        : "bg-gray-200 text-gray-500"
                    }`}
                  >
                    {tabCounts[t]}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Type filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as OrderTypeFilter)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 shadow-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          >
            <option value="all">All Types</option>
            <option value="shop">3D Shop</option>
            <option value="custom_order">Custom Order</option>
          </select>
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div className="flex flex-col items-center justify-center gap-3 py-24">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-400" />
            <p className="text-sm text-gray-400">Loading testimonials…</p>
          </div>
        ) : error ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="font-medium text-red-700">{error}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-3 rounded-lg bg-red-100 px-4 py-2 text-sm font-semibold text-red-700 hover:bg-red-200"
            >
              Retry
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-200 bg-gray-50 py-24 text-center">
            <Star className="h-12 w-12 text-gray-200" />
            <p className="text-base font-medium text-gray-400">
              No testimonials here yet
            </p>
            <p className="text-xs text-gray-300">
              Generate testimonial links from order pages to get started
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filtered.map((review) => {
              const expanded = expandedId === review.id;
              const initial = (review.customer_name ?? "?")[0].toUpperCase();
              const gradient = getGradient(review.customer_name ?? "A");
              const isUpdating = updating === review.id;

              return (
                <div
                  key={review.id}
                  className="rounded-2xl border border-gray-200 bg-white shadow-sm transition-shadow hover:shadow-md"
                >
                  <div className="flex items-start gap-4 p-5">
                    {/* Avatar */}
                    <div
                      className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-gradient-to-br ${gradient} text-sm font-bold text-white shadow-sm`}
                    >
                      {initial}
                    </div>

                    {/* Body */}
                    <div className="min-w-0 flex-1">
                      {/* Top row */}
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-gray-900">
                          {review.customer_name ?? "Anonymous"}
                        </span>
                        <StatusBadge status={review.status} />
                        <TypeChip type={review.order_type} />
                        <span className="text-xs text-gray-400">
                          {timeAgo(review.created_at)}
                        </span>
                      </div>

                      {/* Email */}
                      {review.customer_email && (
                        <p className="mt-0.5 text-xs text-gray-400">
                          {review.customer_email}
                        </p>
                      )}

                      {/* Stars */}
                      <div className="mt-2">
                        <StarRow rating={review.rating} />
                      </div>

                      {/* Title */}
                      {review.title && (
                        <p className="mt-1.5 text-sm font-semibold text-gray-800">
                          {review.title}
                        </p>
                      )}

                      {/* Body */}
                      <p
                        className={`mt-1 text-sm leading-relaxed text-gray-600 ${expanded ? "" : "line-clamp-3"}`}
                      >
                        {review.body ?? (
                          <span className="italic text-gray-400">
                            No description provided
                          </span>
                        )}
                      </p>
                      {review.body && review.body.length > 160 && (
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId(expanded ? null : review.id)
                          }
                          className="mt-1 text-xs font-medium text-indigo-500 hover:text-indigo-700"
                        >
                          {expanded ? "Show less ↑" : "Read more ↓"}
                        </button>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex shrink-0 flex-col items-end gap-2">
                      <Link
                        href={orderPath(review)}
                        target="_blank"
                        className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition hover:border-indigo-300 hover:text-indigo-600"
                        title="View order"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                      </Link>

                      <div className="flex gap-1.5">
                        {review.status !== "approved" && (
                          <button
                            type="button"
                            onClick={() =>
                              void updateStatus(review.id, "approved")
                            }
                            disabled={isUpdating}
                            className="flex h-8 items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-3 text-xs font-semibold text-emerald-700 transition hover:bg-emerald-100 disabled:opacity-50"
                          >
                            {isUpdating ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Check className="h-3 w-3" />
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
                            disabled={isUpdating}
                            className="flex h-8 items-center gap-1 rounded-lg border border-red-200 bg-red-50 px-3 text-xs font-semibold text-red-600 transition hover:bg-red-100 disabled:opacity-50"
                          >
                            <X className="h-3 w-3" />
                            Reject
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Approved banner */}
                  {review.status === "approved" && (
                    <div className="border-t border-emerald-100 bg-emerald-50 px-5 py-2 rounded-b-2xl">
                      <p className="text-xs font-medium text-emerald-600">
                        ✓ Live on landing page
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AdminShell>
  );
}
