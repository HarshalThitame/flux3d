"use client";

import { useEffect, useRef, useState } from "react";
import {
  RefreshCw,
  ChevronLeft,
  ChevronRight,
  Clock,
  RotateCcw,
  Ban,
  CheckCircle2,
  Send,
  LoaderCircle,
  XCircle,
  Inbox,
} from "lucide-react";
import type { EmailQueueRow, EmailQueueStatus } from "types/database";

type QueueItem = EmailQueueRow & { template_name?: string };

const STATUS_COLORS: Record<EmailQueueStatus, string> = {
  queued: "bg-amber-100 text-amber-700 border-amber-200",
  sending: "bg-blue-100 text-blue-700 border-blue-200",
  sent: "bg-emerald-100 text-emerald-700 border-emerald-200",
  delivered: "bg-teal-100 text-teal-700 border-teal-200",
  failed: "bg-red-100 text-red-700 border-red-200",
  cancelled: "bg-gray-100 text-gray-700 border-gray-200",
};

const STATUS_ICONS: Record<EmailQueueStatus, React.ReactNode> = {
  queued: <Clock className="h-3.5 w-3.5" />,
  sending: <Send className="h-3.5 w-3.5" />,
  sent: <CheckCircle2 className="h-3.5 w-3.5" />,
  delivered: <CheckCircle2 className="h-3.5 w-3.5" />,
  failed: <XCircle className="h-3.5 w-3.5" />,
  cancelled: <Ban className="h-3.5 w-3.5" />,
};

export default function EmailQueueTable() {
  const [items, setItems] = useState<QueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(25);
  const [statusFilter, setStatusFilter] = useState<EmailQueueStatus | "">("");
  const [loading, setLoading] = useState(false);
  const [retryingId, setRetryingId] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<string | null>(null);

  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchQueue = async (p: number, l: number) => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(p));
    params.set("limit", String(l));
    if (statusFilter) params.set("status", statusFilter);

    try {
      const res = await fetch(`/api/admin/email-queue?${params.toString()}`);
      const json = await res.json();
      if (res.ok) {
        setItems((json.data as QueueItem[]) ?? []);
        setTotal(json.total ?? 0);
      }
    } catch (err) {
      console.error("[EmailQueueTable] Fetch error:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => {
      setPage(1);
      fetchQueue(1, limit);
    }, 300);
    return () => {
      if (searchTimer.current) clearTimeout(searchTimer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, limit]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- Fetch queue when page changes
    fetchQueue(page, limit);
  }, [page]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleRetry = async (id: string) => {
    setRetryingId(id);
    try {
      const res = await fetch(`/api/admin/email-queue/${id}/retry`, {
        method: "POST",
      });
      if (res.ok) {
        fetchQueue(page, limit);
      } else {
        const json = await res.json();
        alert(json.error ?? "Retry failed");
      }
    } catch {
      alert("Network error while retrying");
    } finally {
      setRetryingId(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm("Cancel this queued email?")) return;
    setCancellingId(id);
    try {
      const res = await fetch(`/api/admin/email-queue/${id}/cancel`, {
        method: "POST",
      });
      if (res.ok) {
        fetchQueue(page, limit);
      } else {
        const json = await res.json();
        alert(json.error ?? "Cancel failed");
      }
    } catch {
      alert("Network error while cancelling");
    } finally {
      setCancellingId(null);
    }
  };

  const formatDate = (iso: string | null) => {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="space-y-5">
      {/* Toolbar */}
      <div className="flex flex-wrap items-end gap-3 rounded-2xl border border-gray-200 bg-white p-4">
        <div className="flex flex-col gap-1">
          <label className="text-xs font-medium text-[#6F7192]">Status</label>
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value as EmailQueueStatus | "")
            }
            className="rounded-xl border border-[#6d28d9]/10 bg-gray-50 px-3 py-2.5 text-sm text-[#0F1B3D] outline-none min-h-[44px]"
          >
            <option value="">All</option>
            <option value="queued">Queued</option>
            <option value="sending">Sending</option>
            <option value="sent">Sent</option>
            <option value="delivered">Delivered</option>
            <option value="failed">Failed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => fetchQueue(page, limit)}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-sm font-medium text-[#0F1B3D] transition hover:bg-gray-50 disabled:opacity-50 min-h-[44px]"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            Refresh
          </button>
        </div>
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
                  Template
                </th>
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                  Scheduled
                </th>
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                  Retries
                </th>
                <th className="px-5 py-3 text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                  Priority
                </th>
                <th className="px-5 py-3 text-right text-[10px] font-medium uppercase tracking-[0.15em] text-[#6F7192]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {items.map((item) => (
                <tr
                  key={item.id}
                  className="border-b border-gray-100 transition-colors hover:bg-gray-50"
                >
                  <td className="px-5 py-3.5">
                    <span
                      className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-semibold ${STATUS_COLORS[item.status]}`}
                    >
                      {STATUS_ICONS[item.status]}
                      {item.status.charAt(0).toUpperCase() +
                        item.status.slice(1)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-[#0F1B3D]">
                    {item.recipient}
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="text-sm text-[#6F7192]">
                      {item.template_name ?? "—"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#6F7192] whitespace-nowrap">
                    {formatDate(item.scheduled_at ?? item.created_at)}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#6F7192]">
                    {item.retry_count} / {item.max_retries}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-[#6F7192]">
                    {item.priority}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {item.status !== "cancelled" &&
                        item.status !== "delivered" && (
                          <>
                            <button
                              type="button"
                              onClick={() => handleRetry(item.id)}
                              disabled={
                                retryingId === item.id ||
                                item.retry_count >= item.max_retries
                              }
                              className="rounded-lg p-1.5 text-[#6F7192] transition hover:bg-gray-100 hover:text-[#0F1B3D] disabled:opacity-40"
                              title="Retry"
                            >
                              {retryingId === item.id ? (
                                <LoaderCircle className="h-4 w-4 animate-spin" />
                              ) : (
                                <RotateCcw className="h-4 w-4" />
                              )}
                            </button>
                            {(item.status === "queued" ||
                              item.status === "sending") && (
                              <button
                                type="button"
                                onClick={() => handleCancel(item.id)}
                                disabled={cancellingId === item.id}
                                className="rounded-lg p-1.5 text-red-500 transition hover:bg-red-50 disabled:opacity-40"
                                title="Cancel"
                              >
                                {cancellingId === item.id ? (
                                  <LoaderCircle className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Ban className="h-4 w-4" />
                                )}
                              </button>
                            )}
                          </>
                        )}
                    </div>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-sm text-[#6F7192]"
                  >
                    <Inbox className="mx-auto mb-2 h-8 w-8 text-gray-300" />
                    No queue items found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
          <div className="text-xs text-[#6F7192]">
            Showing {(page - 1) * limit + 1}–{Math.min(page * limit, total)} of{" "}
            {total}
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
      )}
    </div>
  );
}
