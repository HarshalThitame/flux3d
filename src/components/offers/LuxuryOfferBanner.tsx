"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import Link from "next/link";
import { X, Sparkles, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CountdownTimer from "./CountdownTimer";

type Offer = {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  offer_type: string;
  discount_value: number;
  badge_text: string | null;
  badge_color: string;
  sale_label: string | null;
  ends_at: string;
  is_featured: boolean;
  coupon_code: string | null;
  min_order_value: number;
};

const DISMISS_KEY = "luxury-banner-dismissed";
const DISMISS_TTL = 24 * 60 * 60 * 1000; // 24 hours

function getDismissedState() {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(DISMISS_KEY);
  if (!raw) return false;
  try {
    const ts = Number(raw);
    return Date.now() - ts < DISMISS_TTL;
  } catch {
    return false;
  }
}

function subscribeDismissed(_callback: () => void) {
  return () => {};
}

function dismiss() {
  if (typeof window === "undefined") return;
  localStorage.setItem(DISMISS_KEY, String(Date.now()));
}

export default function LuxuryOfferBanner() {
  const [offer, setOffer] = useState<Offer | null>(null);
  const dismissed = useSyncExternalStore(
    subscribeDismissed,
    getDismissedState,
    () => false,
  );
  const [clientDismissed, setClientDismissed] = useState(false);

  useEffect(() => {
    fetch("/api/offers/active")
      .then((r) => r.json())
      .then((d) => {
        const featured =
          d.offers?.find((o: Offer) => o.is_featured) ?? d.offers?.[0];
        if (featured) setOffer(featured);
      })
      .catch(() => {});
  }, []);

  if (!offer || dismissed || clientDismissed) return null;

  const handleDismiss = () => {
    dismiss();
    setClientDismissed(true);
  };

  const ctaUrl = "/3d-shop";

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -20 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-50 w-full overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #1C1917 0%, #292524 40%, #44403C 100%)",
          borderTop: "1px solid rgba(201, 169, 98, 0.35)",
          borderBottom: "1px solid rgba(201, 169, 98, 0.35)",
        }}
      >
        {/* Subtle gold radial glow behind */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 20% 50%, rgba(201,169,98,0.06) 0%, transparent 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 40% 60% at 85% 50%, rgba(201,169,98,0.04) 0%, transparent 60%)",
          }}
        />

        {/* Background banner image if provided */}
        {offer.banner_url && (
          <div className="pointer-events-none absolute inset-0">
            <Image
              src={offer.banner_url}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover opacity-[0.12]"
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(28,25,23,0.85) 0%, rgba(28,25,23,0.4) 50%, rgba(28,25,23,0.85) 100%)",
              }}
            />
          </div>
        )}

        <div className="relative mx-auto flex w-full max-w-[1400px] flex-col items-center justify-between gap-4 px-4 py-4 sm:flex-row sm:px-8 sm:py-5 lg:px-12">
          {/* Left: content */}
          <div className="flex min-w-0 flex-1 flex-col items-center gap-2 sm:flex-row sm:gap-5">
            {offer.badge_text && (
              <span
                className="inline-flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1 text-[10px] font-bold uppercase tracking-[0.14em] sm:text-[11px]"
                style={{
                  borderColor: "rgba(201, 169, 98, 0.45)",
                  color: "#C9A962",
                  background: "rgba(201, 169, 98, 0.08)",
                }}
              >
                <Sparkles className="h-3 w-3" />
                {offer.badge_text}
              </span>
            )}

            <div className="min-w-0 text-center sm:text-left">
              <h2
                className="truncate text-base font-semibold tracking-[-0.01em] sm:text-lg"
                style={{
                  color: "#FDFCF8",
                  fontFamily: "var(--lux-font-display)",
                }}
              >
                {offer.sale_label && (
                  <span style={{ color: "#C9A962" }}>
                    {offer.sale_label} —{" "}
                  </span>
                )}
                {offer.title}
              </h2>
              {offer.description && (
                <p
                  className="mt-0.5 hidden max-w-[420px] truncate text-xs sm:block"
                  style={{ color: "rgba(253, 252, 248, 0.55)" }}
                >
                  {offer.description}
                </p>
              )}
              {offer.coupon_code && (
                <div className="mt-1.5 flex items-center justify-center gap-2 sm:justify-start">
                  <span
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: "rgba(253,252,248,0.4)" }}
                  >
                    Code
                  </span>
                  <code
                    className="rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold"
                    style={{
                      borderColor: "rgba(201, 169, 98, 0.35)",
                      color: "#C9A962",
                      background: "rgba(201, 169, 98, 0.08)",
                    }}
                  >
                    {offer.coupon_code}
                  </code>
                </div>
              )}
            </div>
          </div>

          {/* Right: countdown + CTA */}
          <div className="flex shrink-0 items-center gap-4 sm:gap-6">
            <CountdownTimer
              targetDate={offer.ends_at}
              size="sm"
              variant="luxury"
            />
            <Link
              href={ctaUrl}
              className="group inline-flex min-h-[36px] items-center gap-2 rounded-full px-5 text-xs font-semibold transition-all duration-300 sm:min-h-[40px] sm:px-6 sm:text-sm"
              style={{
                background: "#C9A962",
                color: "#1C1917",
                boxShadow: "0 4px 16px rgba(201, 169, 98, 0.25)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 6px 24px rgba(201, 169, 98, 0.4)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 16px rgba(201, 169, 98, 0.25)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Shop Now
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>

        {/* Dismiss button */}
        <button
          onClick={handleDismiss}
          aria-label="Dismiss offer banner"
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full p-1.5 transition-colors sm:right-5"
          style={{ color: "rgba(253, 252, 248, 0.35)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "rgba(253, 252, 248, 0.7)";
            e.currentTarget.style.background = "rgba(253, 252, 248, 0.06)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "rgba(253, 252, 248, 0.35)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <X className="h-4 w-4" />
        </button>
      </motion.div>
    </AnimatePresence>
  );
}
