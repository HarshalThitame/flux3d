"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Mail,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Eye,
  XCircle,
  LoaderCircle,
  Filter,
  LayoutTemplate,
  Code2,
} from "lucide-react";
import type {
  EmailLogRow,
  EmailLogStatus,
  EmailType,
} from "../../../types/database";

const STATUS_OPTIONS: EmailLogStatus[] = [
  "queued",
  "sent",
  "delivered",
  "opened",
  "bounced",
  "failed",
  "complained",
  "dropped",
];

const TYPE_OPTIONS: EmailType[] = [
  "welcome",
  "email_verification",
  "password_reset",
  "order_placed_customer",
  "order_placed_admin",
  "model_validation_pass",
  "model_validation_fail",
  "production_started",
  "order_shipped",
  "delivery_confirmation",
  "payment_receipt",
  "payment_failed",
  "refund_issued",
  "contact_notification",
  "stock_alert",
  "back_in_stock",
];

function statusBadgeClass(status: EmailLogStatus): string {
  switch (status) {
    case "delivered":
      return "bg-emerald-100 text-emerald-700 border-emerald-200";
    case "sent":
      return "bg-blue-100 text-blue-700 border-blue-200";
    case "opened":
      return "bg-violet-100 text-violet-700 border-violet-200";
    case "queued":
      return "bg-amber-100 text-amber-700 border-amber-200";
    case "bounced":
    case "failed":
    case "dropped":
      return "bg-red-100 text-red-700 border-red-200";
    case "complained":
      return "bg-orange-100 text-orange-700 border-orange-200";
    default:
      return "bg-gray-100 text-gray-700 border-gray-200";
  }
}

function statusIcon(status: EmailLogStatus) {
  switch (status) {
    case "delivered":
      return <CheckCircle2 className="h-3.5 w-3.5" />;
    case "sent":
      return <Mail className="h-3.5 w-3.5" />;
    case "opened":
      return <Eye className="h-3.5 w-3.5" />;
    case "queued":
      return <Clock className="h-3.5 w-3.5" />;
    case "bounced":
    case "failed":
    case "dropped":
      return <XCircle className="h-3.5 w-3.5" />;
    case "complained":
      return <AlertTriangle className="h-3.5 w-3.5" />;
    default:
      return null;
  }
}

function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatJson(obj: unknown): string {
  try {
    return JSON.stringify(obj, null, 2);
  } catch {
    return String(obj);
  }
}

type Props = {
  initialData: EmailLogRow[];
  initialTotal: number;
};

export default function EmailLogsTable({ initialData, initialTotal }: Props) {
  const router = useRouter();
  const [logs, setLogs] = useState<EmailLogRow[]>(initialData);
  const [total, setTotal] = useState(initialTotal);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [statusFilters, setStatusFilters] = useState<EmailLogStatus[]>([]);
  const [typeFilter, setTypeFilter] = useState<EmailType | "">("");
  const [recipientFilter, setRecipientFilter] = useState("");
  const [templateFilter, setTemplateFilter] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [loading, setLoading] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchLogs = async (p: number, l: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("limit", String(l));
    if (statusFilters.length === 1) {
      params.set("status", statusFilters[0]);
    }
    if (typeFilter) params.set("email_type", typeFilter);
    if (recipientFilter) params.set("recipient", recipientFilter);
    if (dateFrom) params.set("from", new Date(dateFrom).toISOString());
    if (dateTo)
      params.set(
        "to",
        new Date(
          new Date(dateTo).getTime() + 24 * 60 * 60 * 1000,
        ).toISOString(),
      );

    try {
      const res = await fetch(`/api/admin/email-logs?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        let rows = (json.data as EmailLogRow[]) ?? [];
        // Client-side filter for template name and multi-status
        if (templateFilter.trim()) {
          const q = templateFilter.toLowerCase();
          rows = rows.filter((r) => r.template_name?.toLowerCase().includes(q));
        }
        if (statusFilters.length > 1) {
          rows = rows.filter((r) => statusFilters.includes(r.status));
        }
        setLogs(rows);
        setTotal(json.total ?? 0);
      } else {
        console.error("[EmailLogsTable] API error:", json.error);
      }
    } catch (err) {
      console.error("[EmailLogsTable] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  // Debounced search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchLogs(1, limit);
    }, 350);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    statusFilters,
    typeFilter,
    recipientFilter,
    templateFilter,
    dateFrom,
    dateTo,
    limit,
  ]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch logs when page changes
    fetchLogs(page, limit);
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleResend = async (log: EmailLogRow) => {
    setResendingId(log.id);
    try {
      const res = await fetch(`/api/admin/email-logs/${log.id}/resend`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok) {
        alert("Email re-queued successfully");
        fetchLogs(page, limit);
      } else {
        alert(json.error ?? "Failed to resend email");
      }
    } catch {
      alert("Network error while resending");
    } finally {
      setResendingId(null);
    }
  };

  const toggleStatus = (status: EmailLogStatus) => {
    setStatusFilters((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  const activeFilterCount =
    statusFilters.length +
    (typeFilter ? 1 : 0) +
    (recipientFilter ? 1 : 0) +
    (templateFilter ? 1 : 0) +
    (dateFrom || dateTo ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Filters Toolbar */}
      <div className="rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6F7192]">
              Recipient
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7192]" />
              <input
                type="text"
                placeholder="Search email..."
                value={recipientFilter}
                onChange={(e) => setRecipientFilter(e.target.value)}
                className="w-56 rounded-xl border border-[#6d28d9]/10 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-[#0F1B3D] outline-none transition focus:border-[#6d28d9]/30"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6F7192]">
              Template
            </label>
            <div className="relative">
              <LayoutTemplate className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#6F7192]" />
              <input
                type="text"
                placeholder="Template name..."
                value={templateFilter}
                onChange={(e) => setTemplateFilter(e.target.value)}
                className="w-48 rounded-xl border border-[#6d28d9]/10 bg-gray-50 py-2.5 pl-10 pr-3 text-sm text-[#0F1B3D] outline-none transition focus:border-[#6d28d9]/30"
              />
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[#6F7192]">Type</label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as EmailType | "")}
              className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none min-h-[44px]"
            >
              <option value="">All</option>
              {TYPE_OPTIONS.map((t) => (
                <option key={t} value={t}>
                  {t
                    .replace(/_/g, " ")
                    .replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm transition min-h-[44px] ${
              showFilters || activeFilterCount > 0
                ? "border-[#6d28d9]/30 bg-[#6d28d9]/10 text-[#6d28d9]"
                : "border-gray-200 bg-white text-[#6F7192] hover:bg-gray-50"
            }`}
          >
            <Filter className="h-4 w-4" />
            Filters
            {activeFilterCount > 0 && (
              <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#6d28d9] text-[9px] font-bold text-white">
                {activeFilterCount}
              </span>
            )}
          </button>

          <div className="ml-auto flex items-center gap-2">
            <button
              type="button"
              onClick={() => fetchLogs(page, limit)}
              disabled={loading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-[#0F1B3D] transition hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
            >
              <RefreshCw
                className={`h-4 w-4 ${loading ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>

        {/* Expanded filter panel */}
        {showFilters && (
          <div className="mt-4 border-t border-gray-100 pt-4">
            <div className="space-y-4">
              {/* Multi-status checkboxes */}
              <div>
                <label className="mb-2 block text-xs font-medium text-[#6F7192]">
                  Status
                </label>
                <div className="flex flex-wrap gap-2">
                  {STATUS_OPTIONS.map((s) => (
                    <label
                      key={s}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs transition ${
                        statusFilters.includes(s)
                          ? "border-[#6d28d9]/30 bg-[#6d28d9]/10 text-[#6d28d9]"
                          : "border-gray-200 bg-gray-50 text-[#6F7192] hover:bg-gray-100"
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={statusFilters.includes(s)}
                        onChange={() => toggleStatus(s)}
                        className="hidden"
                      />
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </label>
                  ))}
                </div>
              </div>

              {/* Date range */}
              <div className="flex flex-wrap items-end gap-3">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#6F7192]">
                    From
                  </label>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none"
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-medium text-[#6F7192]">
                    To
                  </label>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2 text-sm text-[#0F1B3D] outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setStatusFilters([]);
                    setTypeFilter("");
                    setRecipientFilter("");
                    setTemplateFilter("");
                    setDateFrom("");
                    setDateTo("");
                  }}
                  className="rounded-xl border border-gray-200 bg-white px-3 py-2 text-xs text-[#6F7192] transition hover:bg-gray-50"
                >
                  Clear all
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                  Status
                </th>
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                  Recipient
                </th>
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                  Type
                </th>
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                  Template
                </th>
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                  Subject
                </th>
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                  Sent At
                </th>
                <th className="px-5 py-3 text-right text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log) => (
                <>
                  <tr
                    key={log.id}
                    className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                  >
                    <td className="px-5 py-3.5">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${statusBadgeClass(log.status)}`}
                      >
                        {statusIcon(log.status)}
                        {log.status.charAt(0).toUpperCase() +
                          log.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-5 py-3.5 text-[#0F1B3D]">
                      {log.recipient}
                    </td>
                    <td className="px-5 py-3.5 text-[#6F7192]">
                      {log.email_type.replace(/_/g, " ")}
                    </td>
                    <td className="px-5 py-3.5">
                      {log.template_id ? (
                        <button
                          type="button"
                          onClick={() =>
                            router.push(
                              `/admin/emails/templates/${log.template_id}/edit`,
                            )
                          }
                          className="inline-flex items-center gap-1 text-xs text-[#6d28d9] transition hover:underline"
                        >
                          <LayoutTemplate className="h-3 w-3" />
                          {log.template_name ?? "Edit"}
                        </button>
                      ) : (
                        <span className="text-xs text-[#6F7192]">—</span>
                      )}
                    </td>
                    <td className="px-5 py-3.5 max-w-xs truncate text-[#6F7192]">
                      {log.subject}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-[#6F7192] whitespace-nowrap">
                      {formatDate(log.sent_at ?? log.created_at)}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          type="button"
                          onClick={() =>
                            setExpandedId((prev) =>
                              prev === log.id ? null : log.id,
                            )
                          }
                          className="rounded-lg p-1.5 text-[#6F7192] transition hover:bg-gray-100"
                          title="View details"
                        >
                          {expandedId === log.id ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </button>
                        <button
                          type="button"
                          onClick={() => handleResend(log)}
                          disabled={
                            resendingId === log.id ||
                            (log.status === "bounced" &&
                              log.bounce_type === "hard")
                          }
                          className="inline-flex items-center gap-1 rounded-md bg-violet-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-violet-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                          title={
                            log.status === "bounced" &&
                            log.bounce_type === "hard"
                              ? "Hard bounce — cannot resend"
                              : "Resend"
                          }
                        >
                          {resendingId === log.id ? (
                            <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <RefreshCw className="h-3.5 w-3.5" />
                          )}
                          Resend
                        </button>
                      </div>
                    </td>
                  </tr>
                  {/* Expandable detail row */}
                  {expandedId === log.id && (
                    <tr className="bg-gray-50/70">
                      <td colSpan={7} className="px-5 py-4">
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                          <div className="space-y-2">
                            <div className="flex justify-between text-xs">
                              <span className="text-[#6F7192]">ID</span>
                              <span className="font-mono text-[#0F1B3D]">
                                {log.id}
                              </span>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-[#6F7192]">
                                Provider Message ID
                              </span>
                              <span className="font-mono text-[#0F1B3D]">
                                {log.provider_message_id ?? "—"}
                              </span>
                            </div>
                            {log.order_id && (
                              <div className="flex justify-between text-xs">
                                <span className="text-[#6F7192]">Order ID</span>
                                <span className="font-mono text-[#0F1B3D]">
                                  {log.order_id}
                                </span>
                              </div>
                            )}
                            {log.error_message && (
                              <div className="rounded-lg bg-red-50 p-2 text-xs text-red-700">
                                <span className="font-semibold">Error:</span>{" "}
                                {log.error_message}
                              </div>
                            )}
                          </div>
                          {log.variables_used && (
                            <div>
                              <div className="mb-1 flex items-center gap-1 text-xs font-medium text-[#6F7192]">
                                <Code2 className="h-3 w-3" />
                                Variables Used
                              </div>
                              <pre className="max-h-32 overflow-auto rounded-lg border border-gray-200 bg-white p-2 text-[10px] text-[#0F1B3D]">
                                {formatJson(log.variables_used)}
                              </pre>
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </>
              ))}
              {logs.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-[#6F7192]"
                  >
                    No email logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
        <div className="text-xs text-[#6F7192]">
          Showing <strong>{logs.length}</strong> of <strong>{total}</strong>{" "}
          results
        </div>
        <div className="flex items-center gap-2">
          <select
            value={limit}
            onChange={(e) => {
              setLimit(Number(e.target.value));
              setPage(1);
            }}
            className="rounded-lg border border-gray-300 bg-white px-2 py-1.5 text-xs text-[#6F7192]"
          >
            <option value={25}>25 / page</option>
            <option value={50}>50 / page</option>
            <option value={100}>100 / page</option>
          </select>
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1 || loading}
            aria-label="Previous page"
            className="rounded-lg border border-gray-300 bg-white p-1.5 text-[#6F7192] hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-xs text-[#6F7192]">
            Page {page} of {totalPages}
          </span>
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages || loading}
            aria-label="Next page"
            className="rounded-lg border border-gray-300 bg-white p-1.5 text-[#6F7192] hover:bg-gray-50 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
