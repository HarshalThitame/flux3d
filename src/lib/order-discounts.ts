type DiscountLookupRow = {
  id: string
  order_number: string | null
  discount?: number | string | null
  coupon_code?: string | null
  coupon_id?: string | null
  discount_type?: string | null
}

type RedemptionRow = {
  id: string
  order_id: string | null
  offer_id: string | null
  coupon_id: string | null
  discount_type: string
  discount_applied: number | string
  redeemed_at: string
}

type OfferRow = {
  id: string
  title: string
}

type CouponRow = {
  id: string
  code: string
}

export type OrderDiscountSummary = {
  amount: number
  type: string | null
  label: string | null
  offerName: string | null
  couponCode: string | null
  source: 'offer' | 'coupon' | 'order' | null
}

function normalizeAmount(value: unknown) {
  const amount = Number(value ?? 0)
  return Number.isFinite(amount) ? amount : 0
}

function uniqueValues(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value && value.trim()))))
}

export async function loadOrderDiscountSummary(
  supabase: any,
  rows: DiscountLookupRow[],
): Promise<OrderDiscountSummary> {
  if (rows.length === 0) {
    return {
      amount: 0,
      type: null,
      label: null,
      offerName: null,
      couponCode: null,
      source: null,
    }
  }

  const lookupKeys = uniqueValues(rows.flatMap((row) => [row.order_number, row.id]))
  const fallbackRow = rows[0]

  if (lookupKeys.length === 0) {
    const fallbackAmount = normalizeAmount(fallbackRow.discount)
    return {
      amount: fallbackAmount,
      type: fallbackRow.discount_type ?? null,
      label: fallbackAmount > 0 ? fallbackRow.coupon_code ?? 'Applied discount' : null,
      offerName: null,
      couponCode: fallbackRow.coupon_code ?? null,
      source: fallbackAmount > 0 ? 'order' : null,
    }
  }

  const { data: redemptionData, error: redemptionError } = await supabase
    .from('redemptions')
    .select('id, order_id, offer_id, coupon_id, discount_type, discount_applied, redeemed_at')
    .in('order_id', lookupKeys)
    .order('redeemed_at', { ascending: false })

  if (redemptionError) {
    throw new Error(redemptionError.message)
  }

  const redemptions = (redemptionData ?? []) as RedemptionRow[]
  const redemption = redemptions[0] ?? null
  const offerIds = uniqueValues(redemptions.map((row) => row.offer_id))
  const couponIds = uniqueValues([
    ...redemptions.map((row) => row.coupon_id),
    fallbackRow.coupon_id ?? null,
  ])

  const [offersResult, couponsResult] = await Promise.all([
    offerIds.length > 0
      ? supabase.from('offers').select('id, title').in('id', offerIds)
      : Promise.resolve({ data: [], error: null }),
    couponIds.length > 0
      ? supabase.from('coupons').select('id, code').in('id', couponIds)
      : Promise.resolve({ data: [], error: null }),
  ])

  if ('error' in offersResult && offersResult.error) {
    throw new Error(offersResult.error.message)
  }

  if ('error' in couponsResult && couponsResult.error) {
    throw new Error(couponsResult.error.message)
  }

  const offers = (offersResult.data ?? []) as OfferRow[]
  const coupons = (couponsResult.data ?? []) as CouponRow[]
  const matchedOffer = redemption?.offer_id ? offers.find((offer) => offer.id === redemption.offer_id) ?? null : null
  const matchedCoupon = redemption?.coupon_id
    ? coupons.find((coupon) => coupon.id === redemption.coupon_id) ?? null
    : fallbackRow.coupon_id
      ? coupons.find((coupon) => coupon.id === fallbackRow.coupon_id) ?? null
      : null

  const amount = redemption ? normalizeAmount(redemption.discount_applied) : normalizeAmount(fallbackRow.discount)
  const couponCode = matchedCoupon?.code ?? fallbackRow.coupon_code ?? null
  const offerName = matchedOffer?.title ?? null
  const label = offerName ?? couponCode ?? (amount > 0 ? 'Applied discount' : null)

  return {
    amount,
    type: redemption?.discount_type ?? fallbackRow.discount_type ?? null,
    label,
    offerName,
    couponCode,
    source: matchedOffer ? 'offer' : matchedCoupon ? 'coupon' : amount > 0 ? 'order' : null,
  }
}
