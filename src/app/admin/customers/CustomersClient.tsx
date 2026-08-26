"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import {
  Activity as ActivityIcon,
  Ban,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Clock3,
  Download,
  Edit3,
  Eye,
  FileArchive,
  FileText,
  Loader2,
  MapPin,
  MessageSquare,
  Monitor,
  Package,
  Search,
  ShieldAlert,
  ShoppingBag,
  ShoppingCart,
  Smartphone,
  Tag,
  Tablet,
  Upload,
  UserCheck,
  Users,
  X,
} from "lucide-react";
import AdminToast, {
  type AdminToastState,
} from "@/components/admin/AdminToast";
import type {
  AdminCustomerStatus,
  AdminUser,
  OrderStatus,
} from "@/lib/admin/types";
import {
  getCustomerActivity,
  type CustomerActivityData,
} from "../../../../actions/admin/getCustomerActivity";
import {
  CUSTOMER_PAGE_SIZE,
  useAdminCustomers,
  type CustomerSort,
} from "@/hooks/useAdminCustomers";
import type {
  FeatureUsageRow,
  Json,
  PageVisitRow,
  SearchLogRow,
  UserSessionRow,
} from "../../../../types/database";

const PAGE_SIZE = CUSTOMER_PAGE_SIZE;
type SortKey = "newest" | "most-orders" | "highest-spend" | "last-active";
type DrawerTab =
  "profile" | "orders" | "files" | "invoices" | "notes" | "activity";
type ActivitySectionKey =
  "sessions" | "pageVisits" | "featureUsage" | "searchLogs";

const SORT_TO_SERVER: Record<SortKey, CustomerSort> = {
  newest: { sortBy: "created_at", sortDir: "desc" },
  "most-orders": { sortBy: "total_orders", sortDir: "desc" },
  "highest-spend": { sortBy: "total_spent", sortDir: "desc" },
  "last-active": { sortBy: "last_seen_at", sortDir: "desc" },
};

function formatMoney(value?: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value ?? 0);
}

function formatDate(value?: string) {
  const timestamp = new Date(value ?? "").getTime();
  if (Number.isNaN(timestamp)) return "—";
  return new Date(timestamp).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function initials(name: string, email: string) {
  const source = (name?.trim() || email || "").trim();
  if (!source) return "CU";
  return (
    source
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join("") || "CU"
  );
}

function statusClass(status?: string) {
  switch (status) {
    case "Suspended":
      return "bg-red-100 text-red-700";
    case "Unverified":
      return "bg-yellow-100 text-yellow-800";
    default:
      return "bg-emerald-100 text-emerald-700";
  }
}

function orderStatusClass(status: OrderStatus) {
  switch (status) {
    case "cancelled":
      return "bg-red-100 text-red-700";
    case "pending":
      return "bg-yellow-100 text-yellow-800";
    case "printing":
      return "bg-purple-100 text-purple-800";
    case "shipped":
      return "bg-cyan-100 text-cyan-800";
    case "delivered":
    case "completed":
      return "bg-emerald-100 text-emerald-700";
    default:
      return "bg-blue-100 text-blue-800";
  }
}

export default function CustomersClient({
  initialCustomers,
  initialTotal,
}: {
  initialCustomers: AdminUser[];
  initialTotal: number;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("newest");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(
    null,
  );
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [toast, setToast] = useState<AdminToastState>(null);
  const [overrides, setOverrides] = useState<
    Record<string, Partial<AdminUser>>
  >({});
  const toastTimer = useRef<number | null>(null);
  const syncedSortRef = useRef<SortKey>("newest");

  const {
    customers,
    total,
    loading,
    error,
    page,
    query,
    statusFilter,
    stats,
    statsLoading,
    setQuery,
    setStatusFilter,
    setServerSort,
    setPage,
    refresh,
  } = useAdminCustomers({ initialCustomers, initialTotal });

  useEffect(() => {
    if (syncedSortRef.current !== sortKey) {
      syncedSortRef.current = sortKey;
      setServerSort(SORT_TO_SERVER[sortKey]);
    }
  }, [setServerSort, sortKey]);

  function showToast(nextToast: NonNullable<AdminToastState>) {
    setToast(nextToast);
    if (toastTimer.current !== null) {
      window.clearTimeout(toastTimer.current);
    }
    toastTimer.current = window.setTimeout(() => setToast(null), 2600);
  }

  const mergedCustomers = useMemo(
    () =>
      customers.map((customer) => ({ ...customer, ...overrides[customer.id] })),
    [customers, overrides],
  );

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const selectedCustomer =
    mergedCustomers.find((customer) => customer.id === selectedCustomerId) ??
    null;

  const displayStats = {
    total: stats?.total ?? initialTotal,
    newThisMonth: stats?.newThisMonth ?? 0,
    active: stats?.active ?? 0,
    suspended: stats?.suspended ?? 0,
  };

  async function exportCsv() {
    setExporting(true);
    try {
      const trimmedQuery = query.trim().slice(0, 200);
      const response = await fetch("/api/admin/customers/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format: "csv",
          filter: {
            query: trimmedQuery || undefined,
            status: statusFilter === "all" ? undefined : statusFilter,
            sortBy: SORT_TO_SERVER[sortKey].sortBy,
            sortDir: SORT_TO_SERVER[sortKey].sortDir,
          },
        }),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Failed to export customers.");
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `flux3d-customers-${new Date().toISOString().slice(0, 10)}.csv`;
      link.click();
      URL.revokeObjectURL(url);
      showToast({ type: "success", message: "Customers exported as CSV." });
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error
            ? error.message
            : "Failed to export customers.",
      });
    } finally {
      setExporting(false);
    }
  }

  async function patchCustomer(
    customerId: string,
    payload: Record<string, unknown>,
  ) {
    setUpdatingId(customerId);
    try {
      const response = await fetch(`/api/admin/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        const body = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        throw new Error(body.error ?? "Failed to update customer.");
      }

      const nextPatch: Partial<AdminUser> = {};
      if (payload.status === "Suspended") nextPatch.status = "Suspended";
      if (payload.status === "Active") nextPatch.status = "Active";
      if (typeof payload.notes === "string") nextPatch.notes = payload.notes;
      if (typeof payload.manualCoupon === "string")
        nextPatch.manualCoupon = payload.manualCoupon;
      if (typeof payload.manualCredit === "number")
        nextPatch.manualCredit = payload.manualCredit;
      setOverrides((current) => ({ ...current, [customerId]: nextPatch }));
      showToast({ type: "success", message: "Customer updated." });
      refresh();
    } catch (error) {
      showToast({
        type: "error",
        message:
          error instanceof Error ? error.message : "Failed to update customer.",
      });
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <>
      <div className="min-h-screen bg-[#F8F9FA] text-gray-900">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h1 className="text-3xl font-bold tracking-tight text-gray-900">
                Customers
              </h1>
              <p className="mt-1 text-sm text-gray-600">
                Manage all registered customers
              </p>
            </div>
            <button
              type="button"
              onClick={() => void exportCsv()}
              disabled={exporting}
              className="inline-flex h-10 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-sm font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {exporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              {exporting ? "Exporting…" : "Export CSV"}
            </button>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <StatCard
              icon={<Users className="h-5 w-5" />}
              label="Total Customers"
              value={
                statsLoading && !stats
                  ? "…"
                  : displayStats.total.toLocaleString("en-IN")
              }
            />
            <StatCard
              icon={<UserCheck className="h-5 w-5" />}
              label="New This Month"
              value={
                statsLoading && !stats
                  ? "…"
                  : displayStats.newThisMonth.toLocaleString("en-IN")
              }
            />
            <StatCard
              icon={<Package className="h-5 w-5" />}
              label="Active Customers"
              value={
                statsLoading && !stats
                  ? "…"
                  : displayStats.active.toLocaleString("en-IN")
              }
            />
            <StatCard
              icon={<ShieldAlert className="h-5 w-5" />}
              label="Suspended Accounts"
              value={
                statsLoading && !stats
                  ? "…"
                  : displayStats.suspended.toLocaleString("en-IN")
              }
            />
          </div>

          <div className="mt-6 rounded-xl border border-gray-200 bg-white p-4 shadow-sm">
            <div className="grid gap-3 lg:grid-cols-[minmax(280px,1fr)_180px_220px]">
              <label className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  placeholder="Search by name, email, or phone"
                  className="h-10 w-full rounded-lg border border-gray-300 bg-white pl-9 pr-3 text-sm text-gray-900 outline-none transition placeholder:text-gray-400 focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                />
              </label>
              <select
                value={statusFilter}
                onChange={(event) =>
                  setStatusFilter(
                    event.target.value as "all" | AdminCustomerStatus,
                  )
                }
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
              >
                <option value="all">All Status</option>
                <option value="Active">Active</option>
                <option value="Suspended">Suspended</option>
                <option value="Unverified">Unverified</option>
              </select>
              <select
                value={sortKey}
                onChange={(event) => setSortKey(event.target.value as SortKey)}
                className="h-10 rounded-lg border border-gray-300 bg-white px-3 text-sm text-gray-900 outline-none transition focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
              >
                <option value="newest">Newest</option>
                <option value="most-orders">Most Orders</option>
                <option value="highest-spend">Highest Spend</option>
                <option value="last-active">Last Active</option>
              </select>
            </div>
          </div>

          {error && (
            <div className="mt-6 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
              {error}
            </div>
          )}

          <div
            data-lenis-prevent
            className="mt-6 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm"
          >
            <div className="overflow-x-auto">
              <table className="w-full min-w-[1120px] text-left text-sm">
                <thead className="bg-slate-100 text-xs uppercase tracking-wider text-gray-700">
                  <tr>
                    <Th>Customer</Th>
                    <Th>Phone</Th>
                    <Th>Date Joined</Th>
                    <Th>Total Orders</Th>
                    <Th>Total Spend</Th>
                    <Th>Last Order Date</Th>
                    <Th>Status</Th>
                    <Th>Actions</Th>
                  </tr>
                </thead>
                <tbody>
                  {loading && mergedCustomers.length === 0 ? (
                    Array.from({ length: PAGE_SIZE }).map((_, index) => (
                      <tr key={index} className="border-t border-gray-100">
                        <td colSpan={8} className="px-4 py-5">
                          <div className="h-8 animate-pulse rounded-lg bg-gray-100" />
                        </td>
                      </tr>
                    ))
                  ) : mergedCustomers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-4 py-16 text-center text-sm text-gray-500"
                      >
                        No customers found.
                      </td>
                    </tr>
                  ) : (
                    mergedCustomers.map((customer) => (
                      <tr
                        key={customer.id}
                        className="border-t border-gray-100 transition hover:bg-gray-50"
                      >
                        <td className="px-4 py-4">
                          <div className="flex min-w-0 items-center gap-3">
                            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                              {initials(customer.name, customer.email)}
                            </div>
                            <div className="min-w-0">
                              <div className="truncate font-semibold text-gray-900">
                                {customer.name}
                              </div>
                              <div className="truncate text-xs text-gray-500">
                                {customer.email}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          {customer.phone || "—"}
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          {formatDate(customer.joinedDate)}
                        </td>
                        <td className="px-4 py-4 font-medium text-gray-900">
                          {customer.totalOrders ?? 0}
                        </td>
                        <td className="px-4 py-4 font-semibold text-gray-900">
                          {formatMoney(customer.totalSpent)}
                        </td>
                        <td className="px-4 py-4 text-gray-600">
                          {formatDate(customer.lastOrderDate)}
                        </td>
                        <td className="px-4 py-4">
                          <StatusBadge status={customer.status} />
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <IconButton
                              label="View"
                              onClick={() => setSelectedCustomerId(customer.id)}
                            >
                              <Eye className="h-4 w-4" />
                            </IconButton>
                            <Link
                              href={`/admin/customers/${customer.id}`}
                              aria-label={`Edit ${customer.name}`}
                              className="grid h-9 w-9 place-items-center rounded-lg border border-gray-300 bg-white text-gray-600 transition hover:bg-gray-50 hover:text-violet-700"
                            >
                              <Edit3 className="h-4 w-4" />
                            </Link>
                            <IconButton
                              label="Suspend"
                              disabled={updatingId === customer.id}
                              danger
                              onClick={() =>
                                patchCustomer(customer.id, {
                                  status:
                                    customer.status === "Suspended"
                                      ? "Active"
                                      : "Suspended",
                                })
                              }
                            >
                              <Ban className="h-4 w-4" />
                            </IconButton>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
            <div className="flex flex-col gap-3 border-t border-gray-200 px-4 py-3 text-sm text-gray-600 sm:flex-row sm:items-center sm:justify-between">
              <div>
                Showing {total === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1}
                {" - "}
                {Math.min(currentPage * PAGE_SIZE, total)} of{" "}
                {total.toLocaleString("en-IN")} customers
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={currentPage === 1}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  <ChevronLeft className="h-4 w-4" />
                  Previous
                </button>
                <span className="rounded-lg bg-gray-50 px-3 py-2 text-xs text-gray-700">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    setPage((current) => Math.min(totalPages, current + 1))
                  }
                  disabled={currentPage === totalPages}
                  className="inline-flex h-9 items-center gap-1 rounded-lg border border-gray-300 bg-white px-3 text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {selectedCustomer && (
          <CustomerDrawer
            key={selectedCustomer.id}
            customer={selectedCustomer}
            updating={updatingId === selectedCustomer.id}
            onClose={() => setSelectedCustomerId(null)}
            onPatch={(payload) => patchCustomer(selectedCustomer.id, payload)}
          />
        )}
      </AnimatePresence>
      <AdminToast toast={toast} />
    </>
  );
}

function StatCard({
  icon,
  label,
  value,
}: {
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
      <div className="flex items-center justify-between gap-4">
        <div>
          <div className="text-sm font-medium text-gray-600">{label}</div>
          <div className="mt-2 text-2xl font-bold text-gray-900">{value}</div>
        </div>
        <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
          {icon}
        </div>
      </div>
    </div>
  );
}

function Th({ children }: { children: ReactNode }) {
  return <th className="px-4 py-3 font-bold text-gray-800">{children}</th>;
}

function StatusBadge({ status }: { status?: string }) {
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold ${statusClass(status)}`}
    >
      {status ?? "Active"}
    </span>
  );
}

function IconButton({
  label,
  children,
  danger,
  disabled,
  onClick,
}: {
  label: string;
  children: ReactNode;
  danger?: boolean;
  disabled?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={`grid h-9 w-9 place-items-center rounded-lg border transition disabled:cursor-not-allowed disabled:opacity-40 ${
        danger
          ? "border-red-200 bg-red-50 text-red-600 hover:bg-red-100"
          : "border-gray-300 bg-white text-gray-600 hover:bg-gray-50 hover:text-violet-700"
      }`}
    >
      {children}
    </button>
  );
}

function CustomerDrawer({
  customer,
  updating,
  onClose,
  onPatch,
}: {
  customer: AdminUser;
  updating: boolean;
  onClose: () => void;
  onPatch: (payload: Record<string, unknown>) => void;
}) {
  const [activeTab, setActiveTab] = useState<DrawerTab>("profile");
  const [notes, setNotes] = useState(customer.notes ?? "");
  const [manualCoupon, setManualCoupon] = useState(customer.manualCoupon ?? "");
  const [manualCredit, setManualCredit] = useState(
    String(customer.manualCredit ?? 0),
  );
  const tabs: Array<{ id: DrawerTab; label: string; icon: ReactNode }> = [
    { id: "profile", label: "Profile", icon: <Users className="h-4 w-4" /> },
    { id: "orders", label: "Orders", icon: <Package className="h-4 w-4" /> },
    { id: "files", label: "Files", icon: <FileArchive className="h-4 w-4" /> },
    {
      id: "invoices",
      label: "Invoices",
      icon: <FileText className="h-4 w-4" />,
    },
    { id: "notes", label: "Notes", icon: <Edit3 className="h-4 w-4" /> },
    {
      id: "activity",
      label: "Activity",
      icon: <ActivityIcon className="h-4 w-4" />,
    },
  ];

  return (
    <motion.div
      className="fixed inset-0 z-[110] bg-slate-900/30 backdrop-blur-sm"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <button
        type="button"
        aria-label="Close customer drawer"
        className="absolute inset-0 h-full w-full cursor-default"
        onClick={onClose}
      />
      <motion.aside
        initial={{ x: 520 }}
        animate={{ x: 0 }}
        exit={{ x: 520 }}
        transition={{ type: "spring", damping: 28, stiffness: 240 }}
        className="absolute right-0 top-0 flex h-full w-full max-w-3xl flex-col overflow-hidden bg-white text-gray-900 shadow-2xl"
        data-lenis-prevent
      >
        <div className="border-b border-gray-200 px-5 py-4">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                  {initials(customer.name, customer.email)}
                </div>
                <div className="min-w-0">
                  <h2 className="truncate text-xl font-bold text-gray-900">
                    {customer.name}
                  </h2>
                  <p className="truncate text-sm text-gray-600">
                    {customer.email}
                  </p>
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid h-9 w-9 place-items-center rounded-lg text-gray-500 hover:bg-gray-100"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`inline-flex shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition ${
                  activeTab === tab.id
                    ? "bg-violet-50 text-violet-700"
                    : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        <div data-lenis-prevent className="flex-1 overflow-y-auto px-5 py-5">
          {activeTab === "profile" && (
            <div className="space-y-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <Info label="Name" value={customer.name} />
                <Info label="Email" value={customer.email} />
                <Info label="Phone" value={customer.phone || "—"} />
                <Info label="Joined" value={formatDate(customer.joinedDate)} />
                <Info
                  label="Total Orders"
                  value={String(customer.totalOrders ?? 0)}
                />
                <Info
                  label="Total Spend"
                  value={formatMoney(customer.totalSpent)}
                />
              </div>
              <div className="rounded-xl border border-gray-200 bg-gray-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
                  Address
                </div>
                <p className="mt-2 text-sm leading-6 text-gray-800">
                  {customer.fullAddress || "—"}
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-gray-200 p-4">
                <div>
                  <div className="text-sm font-semibold text-gray-900">
                    Account Status
                  </div>
                  <div className="mt-1">
                    <StatusBadge status={customer.status} />
                  </div>
                </div>
                <button
                  type="button"
                  disabled={updating || customer.status === "Unverified"}
                  onClick={() =>
                    onPatch({
                      status:
                        customer.status === "Suspended"
                          ? "Active"
                          : "Suspended",
                    })
                  }
                  className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {customer.status === "Suspended"
                    ? "Reactivate Account"
                    : "Suspend Account"}
                </button>
              </div>
              <Link
                href={`/admin/customers/${customer.id}`}
                className="inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700"
              >
                Edit Profile
              </Link>
            </div>
          )}

          {activeTab === "orders" && (
            <DrawerListEmpty
              items={customer.orders ?? []}
              empty="No orders placed yet."
            >
              <div className="space-y-3">
                {(customer.orders ?? []).map((order) => (
                  <Link
                    key={order.groupId}
                    href={`/admin/orders/${order.groupId}`}
                    className="block rounded-xl border border-gray-200 p-4 transition hover:bg-gray-50"
                  >
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold text-violet-700">
                          {order.orderNumber}
                        </div>
                        <div className="mt-1 text-xs text-gray-500">
                          {formatDate(order.createdAt)} · {order.itemCount} item
                          {order.itemCount === 1 ? "" : "s"} ·{" "}
                          {order.materialSummary}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-gray-900">
                          {formatMoney(order.grandTotal)}
                        </div>
                        <span
                          className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-xs font-semibold ${orderStatusClass(order.status)}`}
                        >
                          {order.status}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </DrawerListEmpty>
          )}

          {activeTab === "files" && (
            <DrawerListEmpty
              items={customer.files ?? []}
              empty="No uploaded STL files found."
            >
              <div className="space-y-3">
                {(customer.files ?? []).map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4"
                  >
                    <div className="min-w-0">
                      <div
                        className="truncate font-semibold text-gray-900"
                        title={file.fileName}
                      >
                        {file.fileName}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {file.size
                          ? `${(file.size / 1024 / 1024).toFixed(2)} MB`
                          : "Size unknown"}{" "}
                        · {formatDate(file.uploadedAt)}
                      </div>
                    </div>
                    <a
                      href={file.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-2 rounded-lg border border-gray-300 bg-white px-3 text-xs font-medium text-gray-700 hover:bg-gray-50"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Download
                    </a>
                  </div>
                ))}
              </div>
            </DrawerListEmpty>
          )}

          {activeTab === "invoices" && (
            <DrawerListEmpty
              items={customer.invoices ?? []}
              empty="No invoices available."
            >
              <div className="space-y-3">
                {(customer.invoices ?? []).map((invoice) => (
                  <div
                    key={invoice.id}
                    className="flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4"
                  >
                    <div>
                      <div className="font-semibold text-gray-900">
                        {invoice.orderNumber}
                      </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {formatDate(invoice.createdAt)} ·{" "}
                        {formatMoney(invoice.grandTotal)}
                      </div>
                    </div>
                    <a
                      href={invoice.downloadUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex h-9 items-center gap-2 rounded-lg bg-violet-600 px-3 text-xs font-semibold text-white hover:bg-violet-700"
                    >
                      <Download className="h-3.5 w-3.5" />
                      Invoice
                    </a>
                  </div>
                ))}
              </div>
            </DrawerListEmpty>
          )}

          {activeTab === "notes" && (
            <div className="space-y-4">
              <label className="block">
                <span className="text-sm font-medium text-gray-700">
                  Internal Notes
                </span>
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  rows={6}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-3 py-3 text-sm text-gray-900 outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                />
              </label>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Manual Coupon
                  </span>
                  <input
                    value={manualCoupon}
                    onChange={(event) => setManualCoupon(event.target.value)}
                    className="mt-2 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                    placeholder="WELCOME10"
                  />
                </label>
                <label className="block">
                  <span className="text-sm font-medium text-gray-700">
                    Account Credit
                  </span>
                  <input
                    value={manualCredit}
                    onChange={(event) => setManualCredit(event.target.value)}
                    type="number"
                    min="0"
                    className="mt-2 h-10 w-full rounded-lg border border-gray-300 px-3 text-sm outline-none focus:border-violet-600 focus:ring-2 focus:ring-violet-100"
                    placeholder="0"
                  />
                </label>
              </div>
              <button
                type="button"
                disabled={updating}
                onClick={() =>
                  onPatch({
                    notes,
                    manualCoupon,
                    manualCredit: Number(manualCredit || 0),
                  })
                }
                className="inline-flex rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save Notes
              </button>
            </div>
          )}

          {activeTab === "activity" && <ActivityTab customerId={customer.id} />}
        </div>
      </motion.aside>
    </motion.div>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="text-xs font-semibold uppercase tracking-wider text-gray-500">
        {label}
      </div>
      <div className="mt-2 text-sm font-medium text-gray-900">{value}</div>
    </div>
  );
}

function DrawerListEmpty<T>({
  items,
  empty,
  children,
}: {
  items: T[];
  empty: string;
  children: ReactNode;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-xl border border-gray-200 bg-gray-50 p-8 text-center text-sm text-gray-500">
        {empty}
      </div>
    );
  }
  return <>{children}</>;
}

function ActivityTab({ customerId }: { customerId: string }) {
  const [activity, setActivity] = useState<CustomerActivityData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<
    Record<ActivitySectionKey, boolean>
  >({
    sessions: true,
    pageVisits: true,
    featureUsage: true,
    searchLogs: true,
  });

  useEffect(() => {
    let active = true;

    async function loadActivity() {
      try {
        const nextActivity = await getCustomerActivity(customerId);
        if (!active) return;
        setActivity(nextActivity);
      } catch (loadError) {
        if (!active) return;
        setError(
          loadError instanceof Error
            ? loadError.message
            : "Failed to load customer activity.",
        );
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadActivity();

    return () => {
      active = false;
    };
  }, [customerId]);

  function toggleSection(section: ActivitySectionKey) {
    setOpenSections((current) => ({
      ...current,
      [section]: !current[section],
    }));
  }

  if (loading) {
    return <ActivitySkeleton />;
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
        {error}
      </div>
    );
  }

  const data = activity ?? {
    sessions: [],
    pageVisits: [],
    featureUsage: [],
    searchLogs: [],
  };

  return (
    <div className="space-y-4 pb-4">
      <ActivitySection
        title="Sessions"
        description="Login history and device information"
        count={data.sessions.length}
        open={openSections.sessions}
        onToggle={() => toggleSection("sessions")}
      >
        <SessionsSection sessions={data.sessions} />
      </ActivitySection>

      <ActivitySection
        title="Page Visits"
        description="Pages browsed by this customer"
        count={data.pageVisits.length}
        open={openSections.pageVisits}
        onToggle={() => toggleSection("pageVisits")}
      >
        <PageVisitsSection visits={data.pageVisits} />
      </ActivitySection>

      <ActivitySection
        title="Feature Usage"
        description="Features and actions used by this customer"
        count={data.featureUsage.length}
        open={openSections.featureUsage}
        onToggle={() => toggleSection("featureUsage")}
      >
        <FeatureUsageSection usage={data.featureUsage} />
      </ActivitySection>

      <ActivitySection
        title="Search History"
        description="Search terms and filters used by this customer"
        count={data.searchLogs.length}
        open={openSections.searchLogs}
        onToggle={() => toggleSection("searchLogs")}
      >
        <SearchHistorySection logs={data.searchLogs} />
      </ActivitySection>
    </div>
  );
}

function ActivitySection({
  title,
  description,
  count,
  open,
  onToggle,
  children,
}: {
  title: string;
  description: string;
  count: number;
  open: boolean;
  onToggle: () => void;
  children: ReactNode;
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 px-4 py-3 text-left transition hover:bg-gray-50"
      >
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
            <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs font-semibold text-gray-600">
              {count}
            </span>
          </div>
          <p className="mt-0.5 text-xs text-gray-500">{description}</p>
        </div>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-gray-400 transition ${open ? "rotate-180" : ""}`}
        />
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.18 }}
            className="overflow-hidden border-t border-gray-100"
          >
            <div
              data-lenis-prevent
              className="max-h-80 overflow-y-auto px-4 py-4"
            >
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}

function SessionsSection({ sessions }: { sessions: UserSessionRow[] }) {
  if (sessions.length === 0) {
    return (
      <ActivityEmptyState message="No sessions found for this customer." />
    );
  }

  return (
    <div className="space-y-3">
      {sessions.map((session) => (
        <div
          key={session.id}
          className="rounded-xl border border-gray-200 bg-gray-50 p-3"
        >
          <div className="flex items-start gap-3">
            <div className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-white text-violet-600 ring-1 ring-gray-200">
              {deviceIcon(session.device_type)}
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-gray-900">
                    {session.device_type
                      ? capitalize(session.device_type)
                      : "Unknown device"}
                    {" · "}
                    {session.browser || "Unknown browser"}
                    {" · "}
                    {session.os || "Unknown OS"}
                  </div>
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-gray-500">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-3.5 w-3.5" />
                      {formatLocation(session.city, session.country)}
                    </span>
                    {session.ip_address && <span>IP {session.ip_address}</span>}
                  </div>
                </div>
                <span
                  className={`rounded-full px-2 py-0.5 text-xs font-semibold ${session.ended_at ? "bg-gray-200 text-gray-700" : "bg-emerald-100 text-emerald-700"}`}
                >
                  {session.ended_at ? "Ended" : "Active"}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-3 text-xs text-gray-600">
                <span>Started {formatDateTime(session.started_at)}</span>
                <span className="inline-flex items-center gap-1">
                  <Clock3 className="h-3.5 w-3.5" />
                  {formatDuration(session.duration_seconds)}
                </span>
              </div>
            </div>
          </div>
        </div>
      ))}
      <ActivityLimitNote count={sessions.length} />
    </div>
  );
}

function PageVisitsSection({ visits }: { visits: PageVisitRow[] }) {
  if (visits.length === 0) {
    return (
      <ActivityEmptyState message="No page visits found for this customer." />
    );
  }

  const groupedVisits = groupPageVisits(visits);

  return (
    <div className="space-y-4">
      {groupedVisits.map((group) => (
        <div key={group.label}>
          <div className="mb-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
            {group.label}
          </div>
          <div className="space-y-2 border-l border-gray-200 pl-3">
            {group.visits.map((visit) => (
              <div
                key={visit.id}
                className="relative rounded-lg border border-gray-200 bg-gray-50 p-3"
              >
                <span className="absolute -left-[19px] top-4 h-2.5 w-2.5 rounded-full bg-violet-500 ring-4 ring-white" />
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-semibold text-gray-900">
                      {visit.page_name || getPageNameFromUrl(visit.page_url)}
                    </div>
                    <div
                      className="mt-1 truncate text-xs text-gray-500"
                      title={visit.page_url}
                    >
                      {visit.page_url}
                    </div>
                    {visit.referrer_url && (
                      <div
                        className="mt-1 truncate text-xs text-gray-400"
                        title={visit.referrer_url}
                      >
                        from: {visit.referrer_url}
                      </div>
                    )}
                  </div>
                  <div className="shrink-0 text-xs text-gray-500">
                    {formatDateTime(visit.visited_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}
      <ActivityLimitNote count={visits.length} />
    </div>
  );
}

function FeatureUsageSection({ usage }: { usage: FeatureUsageRow[] }) {
  if (usage.length === 0) {
    return (
      <ActivityEmptyState message="No feature usage found for this customer." />
    );
  }

  const summary = Object.entries(
    usage.reduce<Record<string, number>>((acc, item) => {
      acc[item.feature_name] = (acc[item.feature_name] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-4">
      <div className="grid gap-2 sm:grid-cols-2">
        {summary.map(([featureName, count]) => (
          <div
            key={featureName}
            className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-xs font-semibold text-gray-700"
          >
            {formatFeatureName(featureName)}{" "}
            <span className="text-gray-400">x</span> {count}
          </div>
        ))}
      </div>

      <div className="space-y-2">
        {usage.map((item) => {
          const metadataEntries = jsonEntries(item.metadata);
          return (
            <div
              key={item.id}
              className="rounded-xl border border-gray-200 bg-gray-50 p-3"
            >
              <div className="flex gap-3">
                <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white text-violet-600 ring-1 ring-gray-200">
                  {featureIcon(item.feature_name)}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between">
                    <div className="font-semibold text-gray-900">
                      {formatFeatureName(item.feature_name)}
                    </div>
                    <div className="shrink-0 text-xs text-gray-500">
                      {formatDateTime(item.used_at)}
                    </div>
                  </div>
                  {metadataEntries.length > 0 && (
                    <div className="mt-1 text-xs text-gray-500">
                      {metadataEntries
                        .slice(0, 8)
                        .map(
                          ([key, value]) =>
                            `${formatMetadataKey(key)}: ${formatMetadataValue(value)}`,
                        )
                        .join(" · ")}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      <ActivityLimitNote count={usage.length} />
    </div>
  );
}

function SearchHistorySection({ logs }: { logs: SearchLogRow[] }) {
  if (logs.length === 0) {
    return (
      <ActivityEmptyState message="No search history found for this customer." />
    );
  }

  return (
    <div className="space-y-2">
      {logs.map((log) => {
        const filterEntries = jsonEntries(log.filters_applied);
        return (
          <div
            key={log.id}
            className="rounded-xl border border-gray-200 bg-gray-50 p-3"
          >
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <div
                  className={`text-sm font-semibold ${log.search_term ? "text-gray-900" : "text-gray-400"}`}
                >
                  {log.search_term || "No search term"}
                </div>
                {filterEntries.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {filterEntries.map(([key, value]) => (
                      <span
                        key={key}
                        className="rounded-full bg-white px-2 py-1 text-xs text-gray-600 ring-1 ring-gray-200"
                      >
                        {formatMetadataKey(key)}: {formatMetadataValue(value)}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  {log.results_count ?? 0} results
                </div>
              </div>
              <div className="shrink-0 text-xs text-gray-500">
                {formatDateTime(log.searched_at)}
              </div>
            </div>
          </div>
        );
      })}
      <ActivityLimitNote count={logs.length} />
    </div>
  );
}

function ActivitySkeleton() {
  return (
    <div className="space-y-4">
      <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-600 shadow-sm">
        <Loader2 className="h-4 w-4 animate-spin text-violet-600" />
        Loading customer activity
      </div>
      {Array.from({ length: 4 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm"
        >
          <div className="h-4 w-36 animate-pulse rounded bg-gray-200" />
          <div className="mt-2 h-3 w-56 animate-pulse rounded bg-gray-100" />
          <div className="mt-4 space-y-2">
            <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
            <div className="h-12 animate-pulse rounded-lg bg-gray-100" />
          </div>
        </div>
      ))}
    </div>
  );
}

function ActivityEmptyState({ message }: { message: string }) {
  return (
    <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-5 text-center text-sm text-gray-500">
      {message}
    </div>
  );
}

function ActivityLimitNote({ count }: { count: number }) {
  return (
    <div className="pt-1 text-center text-xs text-gray-400">
      Showing most recent {count} records
    </div>
  );
}

function deviceIcon(deviceType: UserSessionRow["device_type"]) {
  if (deviceType === "mobile") return <Smartphone className="h-4 w-4" />;
  if (deviceType === "tablet") return <Tablet className="h-4 w-4" />;
  return <Monitor className="h-4 w-4" />;
}

function featureIcon(featureName: string) {
  const normalized = featureName.toLowerCase();
  if (normalized.includes("quote")) return <Calculator className="h-4 w-4" />;
  if (normalized.includes("order")) return <ShoppingBag className="h-4 w-4" />;
  if (normalized.includes("coupon")) return <Tag className="h-4 w-4" />;
  if (normalized.includes("stl") || normalized.includes("upload"))
    return <Upload className="h-4 w-4" />;
  if (normalized.includes("invoice")) return <Download className="h-4 w-4" />;
  if (normalized.includes("support") || normalized.includes("ticket"))
    return <MessageSquare className="h-4 w-4" />;
  if (normalized.includes("cart")) return <ShoppingCart className="h-4 w-4" />;
  return <ActivityIcon className="h-4 w-4" />;
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function formatLocation(city: string | null, country: string | null) {
  const parts = [city, country].filter(Boolean);
  return parts.length > 0 ? parts.join(", ") : "Location unavailable";
}

function formatDuration(seconds: number | null) {
  if (seconds == null || seconds < 0) return "—";
  if (seconds < 60) return `${seconds}s`;
  if (seconds < 3600) {
    const minutes = Math.floor(seconds / 60);
    return `${minutes}m ${seconds % 60}s`;
  }
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

function formatDateTime(value: string | null) {
  if (!value) return "—";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "—";
  return new Date(timestamp).toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function getISTDateKey(value: string) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Kolkata",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(value));
}

function formatVisitGroup(value: string | null) {
  if (!value) return "Unknown date";
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) return "Unknown date";

  const key = getISTDateKey(value);
  const today = getISTDateKey(new Date().toISOString());
  const yesterdayDate = new Date();
  yesterdayDate.setDate(yesterdayDate.getDate() - 1);
  const yesterday = getISTDateKey(yesterdayDate.toISOString());

  if (key === today) return "Today";
  if (key === yesterday) return "Yesterday";

  return new Date(timestamp).toLocaleDateString("en-IN", {
    timeZone: "Asia/Kolkata",
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function groupPageVisits(visits: PageVisitRow[]) {
  const groups = new Map<string, PageVisitRow[]>();
  for (const visit of visits) {
    const label = formatVisitGroup(visit.visited_at);
    groups.set(label, [...(groups.get(label) ?? []), visit]);
  }
  return Array.from(groups.entries()).map(([label, groupVisits]) => ({
    label,
    visits: groupVisits,
  }));
}

function getPageNameFromUrl(url: string) {
  try {
    const parsed = new URL(url, "https://flux3d.in");
    if (parsed.pathname === "/") return "Home";
    return parsed.pathname
      .split("/")
      .filter(Boolean)
      .map((part) => part.replace(/-/g, " "))
      .map(capitalize)
      .join(" / ");
  } catch {
    return url || "Unknown page";
  }
}

function formatFeatureName(featureName: string) {
  return featureName
    .replace(/^stl_file_uploaded$/, "stl_uploaded")
    .replace(/^cart_item_added$/, "item_added_to_cart")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (match) => match.toUpperCase());
}

function jsonEntries(value: Json | null): Array<[string, Json]> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value).filter(
    (entry): entry is [string, Json] =>
      entry[1] !== undefined && entry[1] !== null,
  );
}

function formatMetadataKey(key: string) {
  return key.replace(/_/g, " ");
}

function formatMetadataValue(value: Json) {
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean")
    return String(value);
  if (value === null) return "—";
  return JSON.stringify(value);
}
