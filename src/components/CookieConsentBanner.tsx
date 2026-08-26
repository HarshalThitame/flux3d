"use client";

import { useEffect, useState } from "react";
import { useConsent } from "@/lib/consent";

/**
 * Cookie consent banner for India (DPDP Act 2023). Shows once until the
 * user makes a choice. Provides Accept All / Accept Essential and an
 * inline "Manage preferences" view with Analytics / Marketing toggles.
 *
 * Consent is persisted to localStorage; analytics (Google Analytics) and
 * marketing (Meta Pixel) load only after the user opts in.
 */
export default function CookieConsentBanner() {
  const { consent, acceptAll, acceptEssential, updateCategories } =
    useConsent();
  const [showPreferences, setShowPreferences] = useState(false);
  // Mount-gate: the server snapshot for consent is always null, so rendering
  // during SSR/hydration would briefly show the banner even when the user has
  // already accepted. Wait until after mount, when localStorage is readable.
  const [mounted, setMounted] = useState(false);
  // eslint-disable-next-line react-hooks/set-state-in-effect -- SSR hydration guard: localStorage is only readable after mount
  useEffect(() => setMounted(true), []);

  if (!mounted || consent !== null) {
    return null;
  }

  const prefs = { essential: true, analytics: false, marketing: false };

  return (
    <div
      role="dialog"
      aria-label="Cookie consent"
      aria-live="polite"
      className="fixed bottom-0 left-0 right-0 z-[100] border-t border-[#6d28d9]/20 bg-white/95 px-4 py-4 shadow-[0_-8px_30px_rgba(0,0,0,0.12)] backdrop-blur"
    >
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#0F1B3D]">
            We value your privacy
          </p>
          <p className="mt-1 text-xs leading-relaxed text-[#6F7192]">
            We use cookies to improve your browsing experience and to understand
            how our site is used. Essential cookies are always on. Analytics and
            marketing cookies are only enabled with your consent.
          </p>
        </div>

        {showPreferences ? (
          <div className="flex flex-col gap-3 rounded-xl border border-[#6d28d9]/15 bg-[#FAF7FF] p-3">
            <label className="flex cursor-pointer items-center justify-between gap-3 text-xs font-medium text-[#0F1B3D]">
              <span>Analytics (Google Analytics)</span>
              <input
                type="checkbox"
                checked={prefs.analytics}
                onChange={(e) =>
                  updateCategories({ ...prefs, analytics: e.target.checked })
                }
                className="h-4 w-4 accent-[#6d28d9]"
              />
            </label>
            <label className="flex cursor-pointer items-center justify-between gap-3 text-xs font-medium text-[#0F1B3D]">
              <span>Marketing (Meta Pixel)</span>
              <input
                type="checkbox"
                checked={prefs.marketing}
                onChange={(e) =>
                  updateCategories({ ...prefs, marketing: e.target.checked })
                }
                className="h-4 w-4 accent-[#6d28d9]"
              />
            </label>
            <button
              type="button"
              onClick={acceptEssential}
              className="rounded-lg bg-[#0F1B3D] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#1a2a52]"
            >
              Save preferences
            </button>
          </div>
        ) : (
          <div className="flex flex-col gap-2 sm:flex-row">
            <button
              type="button"
              onClick={() => setShowPreferences(true)}
              className="rounded-lg border border-[#6d28d9]/30 px-4 py-2 text-xs font-semibold text-[#6d28d9] transition hover:bg-[#6d28d9]/5"
            >
              Manage
            </button>
            <button
              type="button"
              onClick={acceptEssential}
              className="rounded-lg border border-[#0F1B3D]/20 px-4 py-2 text-xs font-semibold text-[#0F1B3D] transition hover:bg-[#0F1B3D]/5"
            >
              Essential only
            </button>
            <button
              type="button"
              onClick={acceptAll}
              className="rounded-lg bg-[#6d28d9] px-4 py-2 text-xs font-semibold text-white transition hover:bg-[#5a1fb5]"
            >
              Accept all
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
