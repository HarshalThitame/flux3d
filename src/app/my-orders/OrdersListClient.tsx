"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import Link from "next/link";
import {
  getOrderStatusClasses,
  getOrderStatusLabel,
  type OrderStatus,
} from "@/lib/orders";
import { ORDERS_TABLE_UNAVAILABLE_MESSAGE } from "@/lib/quote/supabase-errors";
import { OrderCardSkeletonList } from "./OrderCardSkeleton";

type OrderItem = {
  id: string;
  material: string;
  color: string;
  price: number;
  estimatedTime: number;
  fileUrl: string | null;
};

type GroupedOrder = {
  groupId: string;
  orderNumber: string;
  status: OrderStatus;
  grandTotal: number;
  cartDiscountAmount: number;
  createdAt: string;
  itemCount: number;
  items: OrderItem[];
};

type DateFilter = "all" | "today" | "7d" | "30d" | "custom";

interface OrdersListClientProps {
  orders: GroupedOrder[];
  ordersTableUnavailable: boolean;
}

const PAGE_SIZE = 5;

function getDateRange(
  filter: DateFilter,
  customStart?: string,
  customEnd?: string,
): { start: Date | null; end: Date } {
  const end = new Date();
  end.setHours(23, 59, 59, 999);

  if (filter === "all") return { start: null, end };

  const start = new Date();
  start.setHours(0, 0, 0, 0);

  switch (filter) {
    case "today":
      break;
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "custom":
      if (customStart) {
        return {
          start: new Date(customStart),
          end: customEnd ? new Date(customEnd + "T23:59:59") : end,
        };
      }
      return { start: null, end };
    default:
      return { start: null, end };
  }

  return { start, end };
}

function isDateInRange(
  dateStr: string,
  start: Date | null,
  end: Date,
): boolean {
  if (!start) return true;
  const date = new Date(dateStr);
  return date >= start && date <= end;
}

function getFileName(fileUrl: string | null): string {
  if (!fileUrl) return "3D Print Order";
  const parts = fileUrl.split("/");
  const fileName = parts[parts.length - 1];
  return fileName.replace(/\.[^/.]+$/, "");
}

function getStatusDotColor(status: OrderStatus): string {
  switch (status) {
    case "pending":
      return "bg-amber-500";
    case "confirmed":
      return "bg-emerald-500";
    case "printing":
      return "bg-cyan-500";
    case "shipped":
      return "bg-violet-500";
    case "delivered":
      return "bg-sky-500";
    case "completed":
      return "bg-green-500";
    case "cancelled":
      return "bg-slate-500";
    default:
      return "bg-gray-400";
  }
}

export default function OrdersListClient({
  orders,
  ordersTableUnavailable,
}: OrdersListClientProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [dateFilter, setDateFilter] = useState<DateFilter>("all");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [isLoading, setIsLoading] = useState(true);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 400);
    return () => clearTimeout(timer);
  }, []);

  const { start: dateStart, end: dateEnd } = getDateRange(
    dateFilter,
    customStart,
    customEnd,
  );

  const filteredOrders = orders.filter((order) => {
    const matchesSearch = searchQuery
      ? order.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.groupId.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    const matchesDate = isDateInRange(order.createdAt, dateStart, dateEnd);

    return matchesSearch && matchesDate;
  });

  const visibleOrders = filteredOrders.slice(0, visibleCount);
  const hasMore = visibleCount < filteredOrders.length;

  const loadMore = useCallback(() => {
    setVisibleCount((prev) => prev + PAGE_SIZE);
  }, []);

  const infiniteObserver = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    if (!hasMore || isLoading) return;

    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    if (infiniteObserver.current) infiniteObserver.current.disconnect();

    infiniteObserver.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { rootMargin: "200px" },
    );

    infiniteObserver.current.observe(sentinel);

    return () => {
      if (infiniteObserver.current) infiniteObserver.current.disconnect();
    };
  }, [hasMore, isLoading, loadMore, visibleCount]);

  const clearFilters = () => {
    setSearchQuery("");
    setDateFilter("all");
    setCustomStart("");
    setCustomEnd("");
    setVisibleCount(PAGE_SIZE);
  };

  const hasActiveFilters = searchQuery || dateFilter !== "all";

  if (ordersTableUnavailable) {
    return (
      <div className="order-section text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#6d28d9]/10">
          <svg
            className="h-6 w-6 text-[#6d28d9]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z"
            />
          </svg>
        </div>
        <div className="mt-3 text-base font-semibold text-[#070b1d]">
          Orders unavailable
        </div>
        <p className="mt-1 text-sm text-gray-500">
          {ORDERS_TABLE_UNAVAILABLE_MESSAGE}
        </p>
      </div>
    );
  }

  if (orders.length === 0 && !isLoading) {
    return (
      <div className="order-section text-center">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#6d28d9]/10">
          <svg
            className="h-6 w-6 text-[#6d28d9]"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={1.5}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M20.25 7.5l-.625 10.632a2.25 2.25 0 01-2.247 2.118H6.622a2.25 2.25 0 01-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125z"
            />
          </svg>
        </div>
        <div className="mt-3 text-base font-semibold text-[#070b1d]">
          No print requests yet
        </div>
        <p className="mt-1 text-sm text-gray-500">
          Create an instant quote and submit your first print request to start
          tracking it here.
        </p>
        <Link
          href="/instant-quote"
          className="mt-4 inline-flex rounded-xl bg-gradient-to-r from-[#4c1d95] via-[#6d28d9] to-[#7c3aed] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#6d28d9]/20 transition hover:shadow-lg hover:shadow-[#6d28d9]/30"
        >
          Create a print request
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Search + Filter Bar */}
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <svg
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
            />
          </svg>
          <input
            type="text"
            placeholder="Search by Order ID..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="order-search-input w-full rounded-xl border border-gray-200 bg-white py-2.5 pl-10 pr-4 text-sm text-[#070b1d] placeholder-gray-400 shadow-sm transition focus:border-[#6d28d9]/40 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/10"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery("");
                setVisibleCount(PAGE_SIZE);
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 rounded-full p-1 text-gray-400 hover:text-gray-600"
            >
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <select
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value as DateFilter);
              setVisibleCount(PAGE_SIZE);
            }}
            className="order-filter-select rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm text-[#070b1d] shadow-sm transition focus:border-[#6d28d9]/40 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/10"
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="custom">Custom Range</option>
          </select>
        </div>
      </div>

      {/* Custom Date Range Inputs */}
      {dateFilter === "custom" && (
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={customStart}
            onChange={(e) => {
              setCustomStart(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#070b1d] shadow-sm focus:border-[#6d28d9]/40 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/10"
          />
          <span className="text-xs text-gray-400">to</span>
          <input
            type="date"
            value={customEnd}
            onChange={(e) => {
              setCustomEnd(e.target.value);
              setVisibleCount(PAGE_SIZE);
            }}
            className="flex-1 rounded-xl border border-gray-200 bg-white px-3 py-2 text-sm text-[#070b1d] shadow-sm focus:border-[#6d28d9]/40 focus:outline-none focus:ring-2 focus:ring-[#6d28d9]/10"
          />
        </div>
      )}

      {/* Active Filter Indicators */}
      {hasActiveFilters && (
        <div className="flex flex-wrap items-center gap-2">
          {searchQuery && (
            <span className="order-filter-chip inline-flex items-center gap-1">
              <span className="text-[#6d28d9]">
                Search: &quot;{searchQuery}&quot;
              </span>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery("");
                  setVisibleCount(PAGE_SIZE);
                }}
                className="ml-0.5 rounded-full p-0.5 text-[#6d28d9] hover:bg-[#6d28d9]/10"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          )}
          {dateFilter !== "all" && (
            <span className="order-filter-chip inline-flex items-center gap-1">
              <span className="text-[#6d28d9]">
                {dateFilter === "today"
                  ? "Today"
                  : dateFilter === "7d"
                    ? "Last 7 Days"
                    : dateFilter === "30d"
                      ? "Last 30 Days"
                      : "Custom Range"}
              </span>
              <button
                type="button"
                onClick={() => {
                  setDateFilter("all");
                  setCustomStart("");
                  setCustomEnd("");
                  setVisibleCount(PAGE_SIZE);
                }}
                className="ml-0.5 rounded-full p-0.5 text-[#6d28d9] hover:bg-[#6d28d9]/10"
              >
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={2.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </span>
          )}
          <button
            type="button"
            onClick={clearFilters}
            className="text-xs text-gray-500 underline underline-offset-2 hover:text-[#6d28d9]"
          >
            Clear all
          </button>
        </div>
      )}

      {/* Result Count */}
      {filteredOrders.length !== orders.length && (
        <div className="text-xs text-gray-500">
          Showing {visibleOrders.length} of {filteredOrders.length} order
          {filteredOrders.length !== 1 ? "s" : ""}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <OrderCardSkeletonList count={3} />
      ) : filteredOrders.length === 0 ? (
        <div className="order-section text-center">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-gray-100">
            <svg
              className="h-5 w-5 text-gray-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              strokeWidth={1.5}
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z"
              />
            </svg>
          </div>
          <div className="mt-2 text-sm font-semibold text-[#070b1d]">
            No orders found
          </div>
          <p className="mt-1 text-xs text-gray-500">
            {searchQuery
              ? `No orders matching "${searchQuery}"`
              : "No orders in the selected date range"}
          </p>
          <button
            type="button"
            onClick={clearFilters}
            className="mt-3 text-xs font-medium text-[#6d28d9] underline underline-offset-2"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <>
          <div className="flex flex-col gap-4">
            {visibleOrders.map((order, index) => {
              const statusClass = getOrderStatusClasses(order.status);
              const statusLabel = getOrderStatusLabel(order.status);
              const statusDotColor = getStatusDotColor(order.status);
              const date = new Date(order.createdAt).toLocaleDateString(
                "en-IN",
                {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                },
              );

              return (
                <Link
                  key={order.groupId}
                  href={`/my-orders/${order.items[0].id}`}
                  className={`order-list-card status-${order.status} animate-slide-in-up block`}
                  style={{ animationDelay: `${index * 40}ms` }}
                >
                  <div className="flex gap-3 p-4">
                    {/* Status indicator - dedicated left column */}
                    <div className="flex flex-col items-center pt-1">
                      <div
                        className={`h-3 w-3 flex-shrink-0 rounded-full ${statusDotColor}`}
                      />
                    </div>

                    {/* Content area */}
                    <div className="min-w-0 flex-1">
                      {/* Row 1: Title + Status badge */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-sm font-semibold text-[#070b1d]">
                            {getFileName(order.items[0].fileUrl)}
                          </div>
                          {order.itemCount > 1 && (
                            <div className="mt-0.5 text-[11px] font-medium text-[#6d28d9]">
                              +{order.itemCount - 1} more{" "}
                              {order.itemCount - 1 === 1 ? "item" : "items"}
                            </div>
                          )}
                        </div>
                        <span
                          className={`inline-flex flex-shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${statusClass}`}
                        >
                          {statusLabel}
                        </span>
                      </div>

                      {/* Row 2: Order ID + Amount */}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <div className="min-w-0 truncate text-xs text-gray-500">
                          {order.orderNumber}
                        </div>
                        <div className="flex-shrink-0 text-base font-bold text-[#6d28d9]">
                          ₹{order.grandTotal.toFixed(0)}
                        </div>
                      </div>

                      {/* Row 3: Date + Material + Color */}
                      <div className="mt-1.5 flex items-center gap-1.5 text-xs text-gray-500">
                        <time className="flex-shrink-0">{date}</time>
                        <span className="text-gray-300">·</span>
                        <span className="truncate">
                          {order.items[0].material}
                        </span>
                        <span className="flex-shrink-0 text-gray-300">·</span>
                        <span className="flex-shrink-0">
                          {order.items[0].color}
                        </span>
                      </div>

                      {/* Row 4: Item count badge */}
                      <div className="mt-2 flex justify-end">
                        <div className="rounded-full bg-[#6d28d9]/8 px-2 py-0.5 text-[10px] font-medium text-[#6d28d9]">
                          {order.itemCount}{" "}
                          {order.itemCount === 1 ? "item" : "items"}
                        </div>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>

          {/* Infinite Scroll Sentinel */}
          {hasMore && (
            <div
              ref={sentinelRef}
              className="flex items-center justify-center py-4"
            >
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <svg
                  className="h-4 w-4 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                  />
                </svg>
                Loading more...
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
