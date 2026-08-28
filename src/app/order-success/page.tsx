"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  PackageCheck,
  FileText,
  ArrowRight,
  Sparkles,
  PartyPopper,
} from "lucide-react";
import { useBusinessSettings } from "@/lib/settings-context";

type OrderSuccessData = {
  orderId: string;
  orderNumber: string;
  itemCount?: number;
  totalPrice?: number;
};

export default function OrderSuccessPage() {
  const { settings } = useBusinessSettings();
  const router = useRouter();
  const [orderData] = useState<OrderSuccessData | null>(() => {
    if (typeof window !== "undefined") {
      const raw = sessionStorage.getItem("flux3d-order-success");
      if (raw) {
        try {
          return JSON.parse(raw) as OrderSuccessData;
        } catch {
          return null;
        }
      }
    }
    return null;
  });

  useEffect(() => {
    if (!orderData) {
      router.replace("/");
      return;
    }
    // Purchase is reported by the server-side CAPI on capture; no client pixel
    // here avoids duplicate Purchase events with different eventIds.
  }, [orderData, router]);

  if (!orderData) {
    return null;
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-[#FFFFFF]">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute left-1/2 top-0 h-[600px] w-[900px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(16,185,129,0.12),transparent_70%)] blur-[80px]" />
        <div className="absolute right-0 top-1/4 h-[400px] w-[400px] rounded-full bg-[radial-gradient(circle,rgba(109, 40, 217,0.08),transparent_70%)] blur-[60px]" />
        <div className="absolute bottom-0 left-0 h-[500px] w-[500px] rounded-full bg-[radial-gradient(circle,rgba(56,189,248,0.06),transparent_70%)] blur-[70px]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-4 pb-16 pt-8 text-[#070b1d] md:px-8 md:pt-10">
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="mb-8"
        >
          <div className="relative">
            <div className="absolute inset-0 animate-ping rounded-full bg-emerald-400/20" />
            <div className="absolute inset-0 animate-pulse rounded-full bg-emerald-400/10" />
            <div className="relative flex h-28 w-28 items-center justify-center rounded-full bg-[linear-gradient(135deg,rgba(16,185,129,0.2),rgba(5,150,105,0.1))] border border-emerald-400/30">
              <CheckCircle2
                className="h-14 w-14 text-emerald-400"
                strokeWidth={2.5}
              />
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1.5 text-xs font-medium uppercase tracking-[0.2em] text-emerald-600">
            <Sparkles className="h-3.5 w-3.5" />
            Order Confirmed
          </div>

          <h1 className="font-[var(--font-syne)] text-[clamp(2.5rem,6vw,4.5rem)] font-extrabold leading-[0.95] tracking-[-2px] text-[#070b1d]">
            Order{" "}
            <span className="bg-[linear-gradient(135deg,#6d28d9,#a855f7,#6d28d9)] bg-clip-text text-transparent">
              Submitted
            </span>
          </h1>

          <p className="mx-auto mt-5 max-w-[520px] text-base leading-relaxed text-[#6F7192]">
            Your order has been successfully submitted and is now being reviewed
            by our team. You&apos;ll receive updates as your order progresses.
          </p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.35 }}
          className="mt-10 w-full max-w-[480px]"
        >
          <div className="rounded-[28px] border border-[#6d28d9]/10 bg-[linear-gradient(180deg,rgba(255,255,255,0.96),rgba(255,255,255,0.92))] p-6 shadow-[0_18px_70px_rgba(0,0,0,0.28)]">
            <div className="mb-5 flex items-center gap-3">
              <div className="rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-2.5 text-emerald-400">
                <PackageCheck className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[11px] uppercase tracking-[0.22em] text-[#6F7192]">
                  Order Number
                </div>
                <div className="mt-0.5 font-[var(--font-syne)] text-xl font-bold text-[#070b1d]">
                  {orderData.orderNumber}
                </div>
              </div>
            </div>

            <div className="space-y-3">
              {orderData.itemCount !== undefined && (
                <div className="flex items-center justify-between rounded-[16px] border border-[#6d28d9]/10 bg-white/[0.02] px-4 py-3">
                  <span className="text-sm text-[#6F7192]">Items</span>
                  <span className="text-sm font-semibold text-[#070b1d]">
                    {orderData.itemCount} item
                    {orderData.itemCount !== 1 ? "s" : ""}
                  </span>
                </div>
              )}

              {orderData.totalPrice !== undefined && (
                <div className="flex items-center justify-between rounded-[16px] border border-[#6d28d9]/10 bg-white/[0.02] px-4 py-3">
                  <span className="text-sm text-[#6F7192]">Total Amount</span>
                  <span className="text-sm font-semibold text-[#6d28d9]">
                    ₹{orderData.totalPrice.toFixed(0)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between rounded-[16px] border border-[#6d28d9]/10 bg-white/[0.02] px-4 py-3">
                <span className="text-sm text-[#6F7192]">Status</span>
                <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-400/20 bg-amber-400/10 px-3 py-1 text-xs font-medium text-amber-700">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                  Pending Review
                </span>
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
          className="mt-8 flex w-full max-w-[480px] flex-col gap-3"
        >
          <Link
            href={`/my-orders/${orderData.orderId}`}
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[20px] bg-[linear-gradient(135deg,#6d28d9,#a855f7)] px-6 py-4 text-sm font-semibold text-white transition-all hover:opacity-95 hover:shadow-[0_8px_30px_rgba(109, 40, 217,0.3)]"
          >
            <span className="relative z-10 flex items-center gap-2">
              View Order Details
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </span>
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent,rgba(109, 40, 217,0.5))]" />
          </Link>

          <Link
            href="/instant-quote"
            className="group relative flex w-full items-center justify-center gap-2 overflow-hidden rounded-[20px] border border-[#6d28d9]/30 bg-[linear-gradient(135deg,rgba(109, 40, 217,0.12),rgba(109, 40, 217,0.06))] px-6 py-4 text-sm font-semibold text-[#6d28d9] transition-all hover:border-[#6d28d9]/50 hover:bg-[rgba(109, 40, 217,0.15)]"
          >
            <span className="relative z-10 flex items-center gap-2">
              <FileText className="h-4 w-4" />
              Get New Quote
            </span>
            <div className="absolute inset-0 bg-[linear-gradient(135deg,transparent,rgba(109, 40, 217,0.08))]" />
          </Link>

          <Link
            href="/my-orders"
            className="inline-flex w-full items-center justify-center rounded-[18px] border border-[#6d28d9]/10 bg-white/[0.03] px-4 py-3 text-sm font-medium text-[#6F7192] transition-colors hover:bg-white/[0.07]"
          >
            View All Orders
          </Link>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.7 }}
          className="mt-12 flex items-center gap-6 text-xs text-[#6F7192]"
        >
          <div className="flex items-center gap-2">
            <PartyPopper className="h-3.5 w-3.5 text-emerald-400/60" />
            <span>Thank you for choosing {settings.businessName}</span>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
