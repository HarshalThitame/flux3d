import type { ShopMoney } from '@/lib/shop/financials'
import { formatPaise } from '@/lib/shop/financials'

export default function ShopPriceSummary({ money, estimated = false, couponCode, cgstPercent, sgstPercent }: {
  money: ShopMoney; estimated?: boolean; couponCode?: string | null; cgstPercent?: number; sgstPercent?: number
}) {
  const rows = [
    { label: 'Subtotal', value: money.subtotalPaise },
    ...(money.couponDiscountPaise ? [{ label: `Coupon${couponCode ? ` (${couponCode})` : ''}`, value: -money.couponDiscountPaise }] : []),
    ...(money.offerDiscountPaise ? [{ label: 'Automatic offer', value: -money.offerDiscountPaise }] : []),
    { label: estimated ? 'Delivery (estimated)' : 'Delivery', value: money.shippingPaise },
    ...(money.cgstPaise ? [{ label: `CGST${cgstPercent != null ? ` (${cgstPercent}%)` : ''}`, value: money.cgstPaise }] : []),
    ...(money.sgstPaise ? [{ label: `SGST${sgstPercent != null ? ` (${sgstPercent}%)` : ''}`, value: money.sgstPaise }] : []),
  ]
  return <dl className="space-y-3 text-sm" aria-label="Order price breakdown">
    {rows.map(row => <div key={row.label} className="flex justify-between gap-4"><dt>{row.label}</dt><dd className="font-medium tabular-nums">{row.value < 0 ? `−${formatPaise(-row.value)}` : formatPaise(row.value)}</dd></div>)}
    <div className="flex justify-between gap-4 border-t border-[var(--shop-border-light)] pt-4 text-lg font-semibold"><dt>{estimated ? 'Estimated total' : 'Total'}</dt><dd className="tabular-nums">{formatPaise(money.totalPaise)}</dd></div>
  </dl>
}
