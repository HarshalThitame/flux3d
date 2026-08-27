"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import CountdownTimer from "./CountdownTimer";

type Offer = {
  id: string;
  title: string;
  description: string | null;
  banner_url: string | null;
  banner_image_mobile_url: string | null;
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

export default function LuxuryOfferBanner() {
  const [offer, setOffer] = useState<Offer | null>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    fetch("/api/offers/active")
      .then((r) => r.json())
      .then((d) => {
        const featured =
          d.offers?.find((o: Offer) => o.is_featured) ?? d.offers?.[0];
        if (featured) setOffer(featured);
      })
      .catch(() => {});

    const checkMobile = () => setIsMobile(window.innerWidth < 640);
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  if (!offer) return null;

  const ctaUrl = "/3d-shop";
  const bgImage =
    isMobile && offer.banner_image_mobile_url
      ? offer.banner_image_mobile_url
      : offer.banner_url;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-50 w-full overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, #FDFCF8 0%, #F5F3EE 45%, #EBE7E0 100%)",
          borderTop: "1px solid rgba(201, 169, 98, 0.4)",
          borderBottom: "1px solid rgba(201, 169, 98, 0.4)",
          boxShadow: "0 4px 24px rgba(28,25,23,0.06)",
        }}
      >
        {/* Subtle gold radial glow behind */}
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 60% 80% at 20% 50%, rgba(201,169,98,0.12) 0%, transparent 60%)",
          }}
        />
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(ellipse 40% 60% at 85% 50%, rgba(201,169,98,0.08) 0%, transparent 60%)",
          }}
        />

        {/* Background banner image if provided */}
        {bgImage && (
          <div className="pointer-events-none absolute inset-0">
            <Image
              src={bgImage}
              alt=""
              fill
              priority
              sizes="100vw"
              className="object-cover"
              style={{ opacity: 0.5 }}
            />
            <div
              className="absolute inset-0"
              style={{
                background:
                  "linear-gradient(90deg, rgba(253,252,248,0.92) 0%, rgba(253,252,248,0.7) 50%, rgba(253,252,248,0.92) 100%)",
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
                  borderColor: "rgba(201, 169, 98, 0.55)",
                  color: "#8A6D2F",
                  background: "rgba(201, 169, 98, 0.12)",
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
                  color: "#1C1917",
                  fontFamily: "var(--lux-font-display)",
                }}
              >
                {offer.sale_label && (
                  <span style={{ color: "#8A6D2F" }}>
                    {offer.sale_label} —{" "}
                  </span>
                )}
                {offer.title}
              </h2>
              {offer.description && (
                <p
                  className="mt-0.5 hidden max-w-[420px] truncate text-xs sm:block"
                  style={{ color: "rgba(28, 25, 23, 0.62)" }}
                >
                  {offer.description}
                </p>
              )}
              {offer.coupon_code && (
                <div className="mt-1.5 flex items-center justify-center gap-2 sm:justify-start">
                  <span
                    className="text-[10px] uppercase tracking-wider"
                    style={{ color: "rgba(28,25,23,0.45)" }}
                  >
                    Code
                  </span>
                  <code
                    className="rounded-md border px-2 py-0.5 font-mono text-[11px] font-bold"
                    style={{
                      borderColor: "rgba(201, 169, 98, 0.55)",
                      color: "#8A6D2F",
                      background: "rgba(201, 169, 98, 0.12)",
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
              variant="luxury-dark"
            />
            <Link
              href={ctaUrl}
              className="group inline-flex min-h-[36px] items-center gap-2 rounded-full px-5 text-xs font-semibold transition-all duration-300 sm:min-h-[40px] sm:px-6 sm:text-sm"
              style={{
                background: "#C9A962",
                color: "#1C1917",
                boxShadow: "0 4px 16px rgba(201, 169, 98, 0.3)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 6px 24px rgba(201, 169, 98, 0.45)";
                e.currentTarget.style.transform = "translateY(-1px)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.boxShadow =
                  "0 4px 16px rgba(201, 169, 98, 0.3)";
                e.currentTarget.style.transform = "translateY(0)";
              }}
            >
              Shop Now
              <ArrowRight className="h-3.5 w-3.5 transition-transform duration-300 group-hover:translate-x-0.5" />
            </Link>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
