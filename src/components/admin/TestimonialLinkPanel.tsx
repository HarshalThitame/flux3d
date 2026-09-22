"use client";

import { useCallback, useRef, useState } from "react";
import {
  Check,
  Copy,
  Loader2,
  MessageCircle,
  RefreshCw,
  Star,
} from "lucide-react";

interface TestimonialLinkResult {
  token: string;
  url: string;
  whatsappUrl: string | null;
}

interface TestimonialLinkPanelProps {
  /** The API endpoint to POST to. Must return { token, url, whatsappUrl } */
  apiEndpoint: string;
  /** Additional fields to include in the POST body */
  requestBody?: Record<string, unknown>;
  /** Compact mode: renders as a small icon button with a dropdown panel */
  compact?: boolean;
  className?: string;
}

/**
 * Reusable admin component for generating and sharing testimonial links.
 * Used on all 3 order types: instant quote, 3D shop, custom/OMS.
 *
 * Modes:
 * - Default: full-width button + generated URL banner below
 * - Compact: small 📣 icon button + floating popover panel
 */
export default function TestimonialLinkPanel({
  apiEndpoint,
  requestBody = {},
  compact = false,
  className = "",
}: TestimonialLinkPanelProps) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">(
    "idle",
  );
  const [result, setResult] = useState<TestimonialLinkResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [popoverOpen, setPopoverOpen] = useState(false);
  const popoverRef = useRef<HTMLDivElement>(null);

  const generate = useCallback(async () => {
    setState("loading");
    setErrorMsg("");
    try {
      const res = await fetch(apiEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody),
      });
      const data = (await res.json()) as TestimonialLinkResult & {
        error?: string;
      };
      if (!res.ok) throw new Error(data.error ?? "Failed to generate link");
      setResult(data);
      setState("done");
      if (compact) setPopoverOpen(true);
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong");
      setState("error");
    }
  }, [apiEndpoint, requestBody, compact]);

  const copyUrl = useCallback(async () => {
    if (!result?.url) return;
    try {
      await navigator.clipboard.writeText(result.url);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      // Fallback: select input text
    }
  }, [result]);

  const openWhatsApp = useCallback(() => {
    if (result?.whatsappUrl)
      window.open(result.whatsappUrl, "_blank", "noopener,noreferrer");
  }, [result]);

  // ─── Compact mode ─────────────────────────────────────────────────────────
  if (compact) {
    return (
      <div className={`relative inline-block ${className}`}>
        <button
          type="button"
          onClick={
            state === "idle" || state === "error"
              ? generate
              : () => setPopoverOpen((v) => !v)
          }
          disabled={state === "loading"}
          title="Get Testimonial Link"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-amber-200 bg-amber-50 text-amber-700 transition hover:bg-amber-100 disabled:opacity-50"
        >
          {state === "loading" ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Star className="h-4 w-4" />
          )}
        </button>

        {popoverOpen && result && (
          <>
            {/* Backdrop */}
            <div
              className="fixed inset-0 z-40"
              onClick={() => setPopoverOpen(false)}
            />
            {/* Popover */}
            <div
              ref={popoverRef}
              className="absolute right-0 top-10 z-50 w-80 rounded-xl border border-gray-200 bg-white p-4 shadow-xl"
            >
              <p className="mb-2 text-xs font-semibold text-gray-700">
                📣 Testimonial Link
              </p>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={result.url}
                  className="min-w-0 flex-1 rounded-lg border border-gray-200 bg-gray-50 px-2 py-1.5 font-mono text-[11px] text-gray-700"
                />
                <button
                  type="button"
                  onClick={copyUrl}
                  className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-600 transition hover:bg-gray-200"
                >
                  {copied ? (
                    <Check className="h-3.5 w-3.5 text-green-600" />
                  ) : (
                    <Copy className="h-3.5 w-3.5" />
                  )}
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                {result.whatsappUrl && (
                  <button
                    type="button"
                    onClick={openWhatsApp}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-green-600"
                  >
                    <MessageCircle className="h-3.5 w-3.5" />
                    WhatsApp
                  </button>
                )}
                <button
                  type="button"
                  onClick={generate}
                  className="flex items-center gap-1 rounded-lg border border-gray-200 px-2 py-1.5 text-[11px] text-gray-500 transition hover:bg-gray-50"
                >
                  <RefreshCw className="h-3 w-3" />
                  New
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    );
  }

  // ─── Default (full) mode ──────────────────────────────────────────────────
  return (
    <div className={`space-y-3 ${className}`}>
      {/* Generate button */}
      {(state === "idle" || state === "error") && (
        <button
          type="button"
          onClick={generate}
          className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-medium text-amber-800 transition hover:bg-amber-100"
        >
          <Star className="h-4 w-4" />
          Testimonial Link
        </button>
      )}

      {state === "loading" && (
        <div className="inline-flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-500">
          <Loader2 className="h-4 w-4 animate-spin" />
          Generating link...
        </div>
      )}

      {state === "error" && <p className="text-xs text-red-600">{errorMsg}</p>}

      {/* Generated link banner */}
      {state === "done" && result && (
        <div className="rounded-xl border border-green-200 bg-green-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-green-900">
                📣 Testimonial Link Ready
              </p>
              <p className="mt-0.5 text-xs text-green-700">
                Single-use safe link — multi-use enabled.
              </p>
            </div>
            <button
              type="button"
              onClick={generate}
              title="Generate a fresh link"
              className="flex items-center gap-1 rounded-lg border border-green-200 bg-white px-2 py-1 text-[11px] text-green-700 transition hover:bg-green-50"
            >
              <RefreshCw className="h-3 w-3" />
              New Link
            </button>
          </div>

          {/* URL + Copy */}
          <div className="flex items-center gap-2">
            <input
              readOnly
              value={result.url}
              onClick={(e) => (e.target as HTMLInputElement).select()}
              className="min-w-0 flex-1 rounded-lg border border-green-200 bg-white px-3 py-1.5 font-mono text-xs text-gray-700"
            />
            <button
              type="button"
              onClick={copyUrl}
              className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                copied
                  ? "bg-green-600 text-white"
                  : "bg-green-100 text-green-800 hover:bg-green-200"
              }`}
            >
              {copied ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>

          {/* WhatsApp direct share */}
          {result.whatsappUrl && (
            <button
              type="button"
              onClick={openWhatsApp}
              className="mt-2 flex w-full items-center justify-center gap-2 rounded-lg bg-green-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-green-600"
            >
              <MessageCircle className="h-4 w-4" />
              Share on WhatsApp
            </button>
          )}
        </div>
      )}
    </div>
  );
}
