"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Sparkles,
  TriangleAlert,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import Confetti from "@/components/Confetti";
import { getClientCspNonce } from "@/lib/csp-client";

type RazorpayWindow = Window & {
  Razorpay?: new (options: Record<string, unknown>) => {
    open: () => void;
    on?: (
      eventName: string,
      handler: (response: Record<string, string>) => void,
    ) => void;
    close?: () => void;
  };
};

let razorpayScriptPromise: Promise<boolean> | null = null;

function loadRazorpayScript() {
  if (typeof window === "undefined") return Promise.resolve(false);
  if ((window as RazorpayWindow).Razorpay) return Promise.resolve(true);
  if (razorpayScriptPromise) return razorpayScriptPromise;

  razorpayScriptPromise = new Promise<boolean>((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      'script[data-razorpay="checkout"]',
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(true), { once: true });
      existing.addEventListener("error", () => resolve(false), { once: true });
      return;
    }

    const script = document.createElement("script");
    const nonce = getClientCspNonce();
    if (nonce) script.nonce = nonce;
    script.src = "https://checkout.razorpay.com/v1/checkout.js";
    script.async = true;
    script.defer = true;
    script.dataset.razorpay = "checkout";
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.appendChild(script);
  });

  return razorpayScriptPromise;
}

type CheckoutCustomer = {
  name: string;
  email: string;
  contact: string;
};

type CheckoutSessionResponse = {
  keyId: string;
  orderId: string;
  amount: number;
  currency: string;
  name: string;
  description: string;
  reference: string;
  customer: CheckoutCustomer;
  notes: Record<string, string>;
  theme: { color: string };
};

type PaymentTheme = {
  accent: string;
  accentFaint: string;
  accentBorder: string;
  accentText: string;
  buttonBg: string;
  buttonHoverBg: string;
  buttonShadow: string;
  containerBorder: string;
  containerBg: string;
  containerRadius: string;
};

const DEFAULT_THEME: PaymentTheme = {
  accent: "#6d28d9",
  accentFaint: "rgb(245 243 255)",
  accentBorder: "rgb(221 214 254)",
  accentText: "#6d28d9",
  buttonBg: "#6d28d9",
  buttonHoverBg: "#5b21b6",
  buttonShadow: "0 8px 24px rgba(109,40,217,0.3)",
  containerBorder: "rgb(243 232 255)",
  containerBg: "#ffffff",
  containerRadius: "30px",
};

type Props = {
  internalOrderType: "shop_order" | "custom_quote";
  internalOrderId: string;
  createOrderEndpoint: string;
  verifyEndpoint: string;
  statusEndpoint: string;
  successHref: string;
  orderNumber: string;
  amountPaise: number;
  currency: string;
  title: string;
  subtitle: string;
  primaryCtaLabel?: string;
  supportEmail: string;
  supportPhone: string;
  customer: CheckoutCustomer;
  orderSummary: ReactNode;
  themeColor?: string;
  theme?: Partial<PaymentTheme>;
  /** Extra headers (e.g. guest order access token) sent with every payment API call. */
  authHeaders?: Record<string, string>;
  onSuccessAction?: () => void;
};

export default function RazorpayCheckoutClient({
  internalOrderType,
  internalOrderId,
  createOrderEndpoint,
  verifyEndpoint,
  statusEndpoint,
  successHref,
  orderNumber,
  amountPaise,
  currency,
  title,
  subtitle,
  primaryCtaLabel = "Pay securely with Razorpay",
  supportEmail,
  supportPhone,
  customer,
  orderSummary,
  themeColor = "#0f172a",
  theme: themeOverrides,
  authHeaders,
  onSuccessAction,
}: Props) {
  const theme = { ...DEFAULT_THEME, ...themeOverrides };
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<
    "idle" | "creating" | "opened" | "verifying" | "pending" | "paid" | "failed"
  >("idle");
  const checkoutRef = useRef<{
    open: () => void;
    on?: (
      eventName: string,
      handler: (
        response: Record<string, string> & {
          error_code?: string;
          error_description?: string;
          error_reason?: string;
        },
      ) => void,
    ) => void;
    close?: () => void;
  } | null>(null);

  const amountDisplay = useMemo(
    () =>
      new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
        maximumFractionDigits: 2,
      }).format(amountPaise / 100),
    [amountPaise, currency],
  );

  useEffect(() => {
    let active = true;
    void loadRazorpayScript().then((loaded) => {
      if (!active || loaded) return;
      setStatus("failed");
      setMessage("Could not load the secure payment script.");
    });
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (status !== "pending") return;

    let cancelled = false;
    let attempts = 0;
    const poll = async () => {
      while (!cancelled && attempts < 24) {
        attempts += 1;
        try {
          const response = await fetch(statusEndpoint, {
            credentials: "include",
            headers: authHeaders,
          });
          const data = (await response.json().catch(() => ({}))) as {
            paymentStatus?: string;
            error?: string;
          };
          if (!response.ok) {
            throw new Error(data.error || "Could not confirm payment.");
          }

          if (
            data.paymentStatus === "paid" ||
            data.paymentStatus === "captured"
          ) {
            setStatus("paid");
            // Purchase is reported by the server-side CAPI (payments/service.ts)
            // on capture, with catalog-matched content_ids. No client pixel here
            // avoids duplicate Purchase events with different eventIds.
            onSuccessAction?.();
            return;
          }

          if (
            data.paymentStatus === "failed" ||
            data.paymentStatus === "cancelled"
          ) {
            setStatus("failed");
            setMessage("Payment was not completed. You can try again.");
            return;
          }
        } catch (error) {
          if (!cancelled) {
            setMessage(
              error instanceof Error
                ? error.message
                : "Could not confirm payment.",
            );
          }
        }

        await new Promise((resolve) => window.setTimeout(resolve, 2500));
      }

      if (!cancelled) {
        setStatus("failed");
        setMessage(
          "Payment confirmation is taking longer than expected. Please refresh the page or try again.",
        );
      }
    };

    void poll();
    return () => {
      cancelled = true;
    };
  }, [router, status, statusEndpoint, successHref]);

  async function startCheckout() {
    if (loading) return;
    setLoading(true);
    setMessage("");
    setStatus("creating");

    try {
      const response = await fetch(createOrderEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...authHeaders },
        credentials: "include",
        body: JSON.stringify({
          internalOrderType,
          internalOrderId,
          expectedAmountPaise: amountPaise,
          // Meta pixel browser identifiers for CAPI match quality
          fbp: document.cookie.match(/_fbp=([^;]+)/)?.[1] ?? undefined,
          fbc: document.cookie.match(/_fbc=([^;]+)/)?.[1] ?? undefined,
        }),
      });

      const session = (await response
        .json()
        .catch(() => ({}))) as CheckoutSessionResponse & { error?: string };
      if (!response.ok) {
        throw new Error(session.error || "Could not start payment.");
      }

      const loaded = await loadRazorpayScript();
      if (!loaded) {
        throw new Error("Secure payment script failed to load.");
      }

      const RazorpayCtor = (window as RazorpayWindow).Razorpay;
      if (!RazorpayCtor) {
        throw new Error("Secure payment script is unavailable.");
      }

      const options = {
        key: session.keyId,
        amount: session.amount,
        currency: session.currency,
        order_id: session.orderId,
        name: session.name,
        description: session.description,
        image: undefined,
        prefill: {
          name: session.customer.name || customer.name,
          email: session.customer.email || customer.email,
          contact: session.customer.contact || customer.contact,
        },
        notes: session.notes,
        theme: {
          color: session.theme?.color || themeColor,
        },
        modal: {
          escape: false,
          backdropclose: false,
          ondismiss: () => {
            if (status !== "paid") {
              setStatus("failed");
              setMessage("Payment dialog was closed before completion.");
            }
            setLoading(false);
          },
        },
        retry: {
          enabled: true,
          max_count: 2,
        },
        handler: async (response: Record<string, string>) => {
          setStatus("verifying");
          setMessage("Verifying payment...");
          try {
            let verifyResponse: Response | null = null;
            let lastError: unknown;
            const maxRetries = 4;

            for (let i = 0; i < maxRetries; i++) {
              try {
                if (i > 0) {
                  setMessage(`Verifying payment (attempt ${i + 1})...`);
                  await new Promise((resolve) =>
                    window.setTimeout(resolve, 1500 * i),
                  );
                }
                verifyResponse = await fetch(verifyEndpoint, {
                  method: "POST",
                  headers: {
                    "Content-Type": "application/json",
                    ...authHeaders,
                  },
                  credentials: "include",
                  body: JSON.stringify({
                    internalOrderType,
                    internalOrderId,
                    razorpay_order_id: response.razorpay_order_id,
                    razorpay_payment_id: response.razorpay_payment_id,
                    razorpay_signature: response.razorpay_signature,
                  }),
                });
                break; // Network success, exit retry loop
              } catch (e) {
                lastError = e;
                if (i === maxRetries - 1) throw e;
              }
            }

            if (!verifyResponse) {
              throw (
                lastError || new Error("Network error during verification.")
              );
            }

            const verifyBody = (await verifyResponse
              .json()
              .catch(() => ({}))) as { status?: string; error?: string };
            if (!verifyResponse.ok) {
              throw new Error(
                verifyBody.error || "Payment verification failed.",
              );
            }

            if (verifyBody.status === "paid") {
              setStatus("paid");
              // Purchase is reported by the server-side CAPI on capture; no
              // client pixel here avoids duplicate Purchase events.
              onSuccessAction?.();
              return;
            }

            setStatus("pending");
            setMessage("Confirming payment with the gateway...");
          } catch (error) {
            setStatus("failed");
            const rawMsg =
              error instanceof Error
                ? error.message
                : "Payment verification failed.";
            setMessage(
              rawMsg === "Failed to fetch"
                ? "Network connection lost. Please check your internet and click Try Again to verify."
                : rawMsg,
            );
          } finally {
            setLoading(false);
          }
        },
      };

      checkoutRef.current = new RazorpayCtor(options);
      checkoutRef.current.on?.("payment.failed", (response) => {
        setStatus("failed");
        setLoading(false);
        const description =
          response.error_description ||
          response.error_reason ||
          "Payment failed.";
        setMessage(description);
      });

      setStatus("opened");
      checkoutRef.current.open();
    } catch (error) {
      setStatus("failed");
      const rawMsg =
        error instanceof Error ? error.message : "Could not start payment.";
      setMessage(
        rawMsg === "Failed to fetch"
          ? "Network connection lost. Please check your internet and try again."
          : rawMsg,
      );
      setLoading(false);
    }
  }

  useEffect(() => {
    if (status !== "paid") return;
    const timer = window.setTimeout(() => router.replace(successHref), 5000);
    return () => window.clearTimeout(timer);
  }, [status, router, successHref]);

  const showOverlay = status === "paid" || status === "failed";

  return (
    <>
      {status === "paid" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[9999] grid place-items-center bg-white/95 backdrop-blur-md"
        >
          <div className="text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 200 }}
              className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full bg-emerald-100"
            >
              <CheckCircle2 className="h-12 w-12 text-emerald-600" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-black text-[#070b1d]"
            >
              Payment Successful
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-2 text-lg text-[#6b7280]"
            >
              {amountDisplay} · {orderNumber}
            </motion.p>
            <motion.p
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5 }}
              className="mt-6 text-sm text-[#6b7280]"
            >
              Redirecting to your order...
            </motion.p>
          </div>
        </motion.div>
      )}

      {status === "failed" && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-[9999] grid place-items-center bg-white/95 backdrop-blur-md"
        >
          <div className="text-center max-w-sm">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 12, stiffness: 200 }}
              className="mx-auto mb-6 grid h-24 w-24 place-items-center rounded-full bg-red-100"
            >
              <TriangleAlert className="h-12 w-12 text-red-600" />
            </motion.div>
            <motion.h2
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="text-3xl font-black text-[#070b1d]"
            >
              Payment Failed
            </motion.h2>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-2 text-sm leading-6 text-[#6b7280]"
            >
              {message ||
                "Your payment could not be processed. Please try again."}
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              className="mt-6 flex flex-col gap-3"
            >
              <button
                type="button"
                onClick={() => setStatus("idle")}
                className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-2xl px-6 text-sm font-bold text-white transition"
                style={{
                  backgroundColor: theme.buttonBg,
                  boxShadow: theme.buttonShadow,
                }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    theme.buttonHoverBg;
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                    theme.buttonBg;
                }}
              >
                Try Again
              </button>
              <a
                href={`mailto:${supportEmail}`}
                className="text-sm font-medium text-[#6b7280] transition hover:text-[#070b1d]"
              >
                Contact Support
              </a>
            </motion.div>
          </div>
        </motion.div>
      )}

      {status === "paid" && <Confetti active duration={2000} />}

      <div
        className="flex flex-col relative w-full overflow-hidden"
        style={{
          borderRadius: theme.containerRadius,
          border: `1px solid ${theme.containerBorder}`,
          backgroundColor: theme.containerBg,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
        }}
      >
        <div className="p-6 md:p-8">
          <div className="flex flex-col items-center text-center mb-8">
            <div
              className="mb-4 inline-flex items-center justify-center w-12 h-12 rounded-full"
              style={{
                backgroundColor: theme.accentFaint,
                color: theme.accentText,
                border: `1px solid ${theme.accentBorder}`,
              }}
            >
              <ShieldCheck className="w-6 h-6" />
            </div>
            <h2
              className="text-xl md:text-2xl font-light tracking-widest uppercase"
              style={{ color: "var(--shop-text-primary, inherit)" }}
            >
              {title}
            </h2>
            {subtitle && (
              <p
                className="mt-2 text-xs font-light tracking-wide"
                style={{ color: "var(--shop-text-muted, #6b7280)" }}
              >
                {subtitle}
              </p>
            )}
          </div>

          <div
            className="rounded-[16px] p-5 mb-8 transition-colors"
            style={{
              backgroundColor: theme.accentFaint,
              border: `1px solid ${theme.accentBorder}`,
            }}
          >
            {orderSummary}
          </div>

          {message && (
            <div
              className={`mb-6 p-4 rounded-xl text-xs tracking-wide text-center backdrop-blur-md border ${
                status === "failed"
                  ? "border-red-500/30 bg-red-500/10 text-red-500"
                  : status === "pending" || status === "verifying"
                    ? "border-amber-500/30 bg-amber-500/10 text-amber-500"
                    : "border-emerald-500/30 bg-emerald-500/10 text-emerald-500"
              }`}
            >
              <div className="flex items-center justify-center gap-2 mb-1">
                {status === "failed" ? (
                  <TriangleAlert className="w-4 h-4" />
                ) : (
                  <Sparkles className="w-4 h-4" />
                )}
                <span className="font-semibold uppercase tracking-widest text-[10px]">
                  {status === "failed"
                    ? "Issue"
                    : status === "pending"
                      ? "Confirming"
                      : "Status"}
                </span>
              </div>
              <p className="font-light">{message}</p>
            </div>
          )}

          <button
            type="button"
            onClick={startCheckout}
            disabled={loading || status === "verifying" || status === "paid"}
            className="relative w-full flex items-center justify-center min-h-[56px] rounded-full overflow-hidden group disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            style={{ boxShadow: theme.buttonShadow }}
          >
            <div
              className="absolute inset-0 transition-opacity duration-500"
              style={{ backgroundColor: theme.buttonBg }}
            />
            <div
              className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
              style={{ backgroundColor: theme.buttonHoverBg }}
            />
            <span
              className="relative z-10 flex items-center gap-2 text-sm font-semibold tracking-widest uppercase"
              style={{ color: "var(--shop-bg-base, #ffffff)" }}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {loading ? "Processing..." : primaryCtaLabel}
            </span>
          </button>

          <div className="mt-8 flex flex-col items-center justify-center gap-2 text-center">
            <div
              className="text-[9px] uppercase tracking-[0.3em]"
              style={{ color: "var(--shop-text-muted, #9ca3af)" }}
            >
              Secured by Razorpay
            </div>
            <div
              className="text-[10px] font-mono tracking-widest"
              style={{ color: "var(--shop-text-muted, #9ca3af)", opacity: 0.5 }}
            >
              REF: {orderNumber}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
