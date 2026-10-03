"use client";
import { useState } from 'react';
import ShopPriceSummary from './ShopPriceSummary';
import { useShopDestination, useShopQuote } from './useShopQuote';

export default function ShopQuoteSummary({ pricing, allowDestination = false }: { pricing: ReturnType<typeof useShopQuote>; allowDestination?: boolean }) {
  const destination = useShopDestination(state => state.destination);
  const setDestination = useShopDestination(state => state.setDestination);
  const [pincode, setPincode] = useState(destination.pincode);
  const [deliveryError, setDeliveryError] = useState('');
  const [checking, setChecking] = useState(false);
  async function checkDestination() {
    setChecking(true); setDeliveryError('');
    try {
      const response = await fetch(`/api/3d-shop/pincode/${pincode}`);
      const result = await response.json();
      if (!response.ok || !result.serviceable) throw new Error(result.error || 'Enter a valid delivery pincode.');
      setDestination({ pincode, state: result.state });
    } catch (error) { setDeliveryError(error instanceof Error ? error.message : 'Unable to verify delivery.'); }
    finally { setChecking(false); }
  }
  return <div className="space-y-4" aria-live="polite">
    {allowDestination && <div className="space-y-2"><label className="block text-sm">Delivery pincode<input aria-label="Delivery pincode" inputMode="numeric" maxLength={6} value={pincode} onChange={e => setPincode(e.target.value.replace(/\D/g,''))} className="mt-2 w-full rounded-xl border border-[var(--shop-border-light)] bg-white px-3 py-2" /></label><button type="button" disabled={checking || !/^\d{6}$/.test(pincode)} onClick={() => void checkDestination()} className="text-sm underline disabled:opacity-50">{checking ? 'Checking…' : 'Update delivery'}</button>{destination.pincode && <p className="text-xs">Delivery to {destination.pincode}, {destination.state}</p>}{deliveryError && <p role="alert" className="text-sm text-red-700">{deliveryError}</p>}</div>}
    {pricing.loading && <p role="status" className="text-sm">Verifying your total…</p>}
    {pricing.error && <div role="alert" className="text-sm text-red-700"><p>{pricing.error}</p><button type="button" onClick={pricing.retry} className="mt-2 underline">Retry</button></div>}
    {pricing.quote && <ShopPriceSummary money={pricing.quote.snapshot.money} estimated={pricing.quote.estimated} couponCode={pricing.quote.couponCode} cgstPercent={pricing.quote.snapshot.cgst_percent} sgstPercent={pricing.quote.snapshot.sgst_percent} />}
  </div>
}
