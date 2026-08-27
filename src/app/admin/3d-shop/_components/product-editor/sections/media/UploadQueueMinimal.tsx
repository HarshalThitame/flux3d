"use client";

import { AlertCircle, Check, Loader2, RotateCcw, X } from "lucide-react";

export type UploadQueueItem = {
  id: string;
  file: File;
  name: string;
  status: "queued" | "uploading" | "done" | "error";
  progress: number;
  error?: string;
};

function CircularProgress({ progress }: { progress: number }) {
  const radius = 13;
  const circumference = 2 * Math.PI * radius;
  return (
    <svg
      className="h-7 w-7 -rotate-90 shrink-0"
      viewBox="0 0 30 30"
      aria-hidden="true"
    >
      <circle
        cx="15"
        cy="15"
        r={radius}
        fill="none"
        stroke="#f3f4f6"
        strokeWidth="3"
      />
      <circle
        cx="15"
        cy="15"
        r={radius}
        fill="none"
        stroke="#6d28d9"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={circumference - (progress / 100) * circumference}
      />
    </svg>
  );
}

export function UploadQueueMinimal({
  items,
  onRetry,
  onDismiss,
  onDismissAll,
}: {
  items: UploadQueueItem[];
  onRetry: (id: string) => void;
  onDismiss: (id: string) => void;
  onDismissAll: () => void;
}) {
  const active = items.filter(
    (item) => item.status === "uploading" || item.status === "queued",
  );
  const done = items.filter((item) => item.status === "done");
  const errored = items.filter((item) => item.status === "error");

  if (items.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[80] w-[320px] max-w-[calc(100vw-3rem)] space-y-2">
      {active.length > 0 && (
        <div className="rounded-2xl border border-gray-100 bg-white/90 p-3 shadow-[0_16px_48px_rgba(15,27,61,0.14)] backdrop-blur">
          <div className="flex items-center justify-between px-1 pb-2">
            <span className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#6F7192]">
              Uploading {active.length} image{active.length === 1 ? "" : "s"}
            </span>
            <button
              type="button"
              onClick={onDismissAll}
              className="rounded-md p-1 text-[#6F7192] transition hover:bg-gray-100"
              aria-label="Dismiss all uploads"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
          <div className="space-y-1.5">
            {items
              .filter(
                (item) =>
                  item.status === "uploading" || item.status === "queued",
              )
              .map((item) => (
                <div
                  key={item.id}
                  className="flex items-center gap-2.5 rounded-xl bg-gray-50 px-2.5 py-2"
                >
                  {item.status === "queued" ? (
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-[#6d28d9]" />
                  ) : (
                    <CircularProgress progress={item.progress} />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-xs font-medium text-[#0F1B3D]">
                      {item.name}
                    </div>
                  </div>
                  <span className="shrink-0 text-[10px] font-bold text-[#6d28d9]">
                    {item.progress}%
                  </span>
                </div>
              ))}
          </div>
        </div>
      )}

      {errored.length > 0 &&
        errored.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-2.5 rounded-2xl border border-rose-100 bg-white p-3 shadow-[0_16px_48px_rgba(15,27,61,0.14)]"
          >
            <AlertCircle className="h-5 w-5 shrink-0 text-rose-600" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-xs font-semibold text-[#0F1B3D]">
                {item.name}
              </div>
              <div className="truncate text-[11px] text-rose-600">
                {item.error}
              </div>
            </div>
            <button
              type="button"
              onClick={() => onRetry(item.id)}
              className="inline-flex shrink-0 items-center gap-1 rounded-lg border border-[#6d28d9]/20 px-2 py-1 text-[11px] font-semibold text-[#6d28d9] hover:bg-[#6d28d9]/5"
            >
              <RotateCcw className="h-3 w-3" />
              Retry
            </button>
            <button
              type="button"
              onClick={() => onDismiss(item.id)}
              className="shrink-0 rounded-lg p-1 text-[#6F7192] hover:bg-gray-100"
              aria-label="Dismiss"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}

      {done.length > 0 && (
        <div className="flex items-center justify-between rounded-2xl border border-emerald-100 bg-white p-3 shadow-[0_16px_48px_rgba(15,27,61,0.14)]">
          <div className="flex items-center gap-2.5">
            <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-emerald-500 text-white">
              <Check className="h-4 w-4" />
            </span>
            <span className="text-xs font-semibold text-[#0F1B3D]">
              {done.length} image{done.length === 1 ? "" : "s"} uploaded
            </span>
          </div>
          <button
            type="button"
            onClick={onDismissAll}
            className="rounded-md p-1 text-[#6F7192] hover:bg-gray-100"
            aria-label="Dismiss"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
