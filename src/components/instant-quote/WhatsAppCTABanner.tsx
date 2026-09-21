"use client";

import { MessageCircle } from "lucide-react";

type WhatsAppCTABannerProps = {
  whatsappNumber: string;
  show: boolean;
};

export default function WhatsAppCTABanner({
  whatsappNumber,
  show,
}: WhatsAppCTABannerProps) {
  const cleanNumber = whatsappNumber.replace(/\D/g, "");
  if (!show || !cleanNumber) return null;

  const href = `https://wa.me/${cleanNumber}?text=${encodeURIComponent(
    "Hi! I have more than 5 files for 3D printing and would like a custom quotation.",
  )}`;

  return (
    <div className="shrink-0 border-t border-[#6d28d9]/10 bg-white px-4 py-3">
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 transition-colors hover:bg-emerald-100"
      >
        <MessageCircle className="h-5 w-5 shrink-0 text-emerald-600" />
        <span>
          <span className="block font-semibold">Have more than 5 files?</span>
          <span className="block text-xs text-emerald-700">
            Reach out on WhatsApp for a custom bulk quotation →
          </span>
        </span>
      </a>
    </div>
  );
}
