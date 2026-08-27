"use client";

import Link from "next/link";
import { ArrowLeftRight, ShoppingCart, FileText, Badge } from "lucide-react";
import { useShopCartStore } from "@/stores/shopCartStore";

type CartSwitcherProps = {
  variant: "quote" | "shop";
  quoteCartCount?: number;
};

export default function CartSwitcher({
  variant,
  quoteCartCount = 0,
}: CartSwitcherProps) {
  const shopItems = useShopCartStore((state) => state.items);

  const isQuoteCart = variant === "quote";
  const OtherCartLabel = isQuoteCart ? "3D Shop Cart" : "Custom Cart";
  const OtherCartHref = isQuoteCart ? "/3d-shop/cart" : "/cart";
  const OtherCartIcon = isQuoteCart ? ShoppingCart : FileText;
  const otherCartCountValue = isQuoteCart ? shopItems.length : quoteCartCount;
  const accentFrom = isQuoteCart ? "from-violet-600" : "from-emerald-600";
  const accentVia = isQuoteCart ? "via-purple-600" : "via-teal-600";
  const accentTo = isQuoteCart ? "to-indigo-600" : "to-cyan-600";
  const bgGradient = isQuoteCart
    ? "from-violet-50/80 via-purple-50/60 to-indigo-50/40"
    : "from-emerald-50/80 via-teal-50/60 to-cyan-50/40";
  const borderColor = isQuoteCart
    ? "border-violet-200/60"
    : "border-emerald-200/60";
  const iconBg = isQuoteCart
    ? "bg-gradient-to-br from-violet-600 to-indigo-600"
    : "bg-gradient-to-br from-emerald-600 to-teal-600";

  return (
    <div
      className={`relative overflow-hidden rounded-2xl border ${borderColor} bg-gradient-to-r ${bgGradient} p-4 sm:p-5`}
    >
      {/* Decorative gradient blob */}
      <div
        className={`pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-gradient-to-br ${accentFrom} ${accentVia} ${accentTo} opacity-[0.06] blur-2xl`}
      />

      <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: info */}
        <div className="flex items-center gap-3.5">
          <div
            className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg} text-white shadow-lg`}
          >
            <ArrowLeftRight className="h-5 w-5" />
          </div>
          <div>
            <p className="text-sm font-semibold text-[#070b1d]">
              Switch to {OtherCartLabel}
            </p>
            <p className="mt-0.5 text-xs text-[#6F7192]">
              {otherCartCountValue > 0
                ? `${otherCartCountValue} item${otherCartCountValue > 1 ? "s" : ""} waiting in your ${OtherCartLabel.toLowerCase()}`
                : `Your ${OtherCartLabel.toLowerCase()} is empty`}
            </p>
          </div>
        </div>

        {/* Right: CTA + badge */}
        <div className="flex items-center gap-3 sm:gap-4">
          {otherCartCountValue > 0 && (
            <span
              className={`inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r ${accentFrom} ${accentVia} ${accentTo} px-3 py-1 text-xs font-bold text-white shadow-sm`}
            >
              <Badge className="h-3 w-3" />
              {otherCartCountValue}
            </span>
          )}
          <Link
            href={OtherCartHref}
            className={`inline-flex min-h-[44px] items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${accentFrom} ${accentVia} ${accentTo} px-5 text-sm font-semibold text-white shadow-lg transition-all duration-200 hover:scale-[1.02] hover:shadow-xl active:scale-[0.98]`}
          >
            <OtherCartIcon className="h-4 w-4" />
            Open {OtherCartLabel}
          </Link>
        </div>
      </div>
    </div>
  );
}
