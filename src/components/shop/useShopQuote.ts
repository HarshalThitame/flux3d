"use client";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { persist } from "zustand/middleware";
import { useShopCartStore } from "@/stores/shopCartStore";
import type { ShopQuote } from "@/lib/shop/quote-types";

type Destination = { pincode: string; state: string };
export const useShopDestination = create<{ destination: Destination; setDestination: (value: Destination) => void }>()(
  persist((set) => ({ destination: { pincode: "", state: "" }, setDestination: destination => set({ destination }) }), { name: "shop-delivery-destination" }),
);

export function useShopQuote(destinationOverride?: Destination | null, enabled = true) {
  const items = useShopCartStore(state => state.items);
  const couponCode = useShopCartStore(state => state.couponCode);
  const appliedOfferId = useShopCartStore(state => state.autoApplyOffer?.id ?? null);
  const saved = useShopDestination(state => state.destination);
  const destination = destinationOverride === undefined ? saved : destinationOverride;
  const key = JSON.stringify({ items: items.map(({ productId, skuId, quantity, customizationText }) => ({ productId, skuId, quantity, customizationText })), couponCode, appliedOfferId,
    destination: destination && /^\d{6}$/.test(destination.pincode) && destination.state.trim() ? destination : null });
  const [result, setResult] = useState<{ key: string; quote?: ShopQuote; error?: string } | null>(null);
  const [refresh, setRefresh] = useState(0);
  useEffect(() => {
    if (!enabled || !items.length) return;
    const controller = new AbortController();
    const timer = setTimeout(() => {
      fetch('/api/3d-shop/pricing/quote', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: key, signal: controller.signal })
        .then(async response => {
          const data = await response.json();
          if (!response.ok || !data.quote) throw new Error(data.error || 'Unable to verify your total. Please retry.');
          if (!controller.signal.aborted) setResult({ key, quote: data.quote });
        }).catch(error => { if (!controller.signal.aborted) setResult({ key, error: error instanceof Error ? error.message : 'Unable to verify your total.' }); });
    }, 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [key, enabled, items.length, refresh]);
  const current = result?.key === key ? result : null;
  return { quote: current?.quote ?? null, error: current?.error ?? null, loading: enabled && items.length > 0 && !current,
    retry: () => { setResult(null); setRefresh(value => value + 1); } };
}
