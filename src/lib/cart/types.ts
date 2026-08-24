import { type QuoteConfig } from '@/lib/quote/types';

export type CartDiscountTier = {
  minCartValue: number;
  discountPercent: number;
};

export type CartItem = {
  id: string;
  quoteId?: string;
  name: string;
  fileName?: string;
  fileUrl?: string;
  image?: string;
  price: number;
  quantity?: number;
  material: string;
  color: string;
  infill?: number;
  layerHeight?: number;
  supports?: boolean;
  materialCost?: number;
  machineCost?: number;
  subtotal?: number;
  overheadPercentage?: number;
  overheadAmount?: number;
  marginPercentage?: number;
  marginAmount?: number;
  postProcessingCharges?: number;
  totalPrice?: number;
  cartDiscountAmount?: number;
  cartDiscountPercent?: number;
  finalPrice?: number;
  deliveryCharge?: number;
  grandTotal?: number;
  estimatedTime?: number;
  weight?: number;
  modelVolumeMm3?: number;
  difficultyFactor?: number;
  dimensions?: {
    x: number;
    y: number;
    z: number;
  };
  config?: QuoteConfig;
  addedAt?: string;
  serverLineId?: string;
}

export type CartOrderItem = {
  quoteId?: string;
  fileUrl?: string;
  fileName?: string;
  material: string;
  color: string;
  infill: number;
  layerHeight: number;
  postProcessingLevel: QuoteConfig['postProcessingLevel'];
  supports: boolean;
  materialCost?: number;
  machineCost?: number;
  subtotal?: number;
  overheadPercentage?: number;
  overheadAmount?: number;
  marginPercentage?: number;
  marginAmount?: number;
  postProcessingCharges?: number;
  totalPrice?: number;
  cartDiscountAmount?: number;
  cartDiscountPercent?: number;
  finalPrice?: number;
  deliveryCharge?: number;
  grandTotal?: number;
  price: number;
  estimatedTime: number;
  weight: number;
  difficultyFactor?: number;
  dimensions: {
    x: number;
    y: number;
    z: number;
  };
}

export type AppliedCoupon = {
  id: string
  code: string
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping'
  discount_value: number
  max_discount: number | null
  min_order_value: number
  discount_amount: number
  applicable_categories?: string[] | null
  applicable_materials?: string[] | null
  applicable_products?: string[] | null
  free_shipping?: boolean
}

export type AppliedOffer = {
  id: string
  title: string
  code: string
  discount_type: 'percentage' | 'fixed_amount' | 'free_shipping' | 'buy_x_get_y'
  discount_value: number
  max_discount: number | null
  min_order_value: number
  discount_amount: number
  sale_label?: string | null
  badge_text?: string | null
  applicable_categories?: string[] | null
  applicable_materials?: string[] | null
  applicable_products?: string[] | null
  free_shipping?: boolean
}

export type CartSummary = {
  items: CartItem[];
  itemCount: number;
  itemsTotal: number;
  subtotal: number;
  cartDiscountAmount: number;
  cartDiscountPercent: number;
  couponDiscountAmount: number;
  couponCode: string | null;
  couponId: string | null;
  couponDiscountType: AppliedCoupon['discount_type'] | null;
  offerDiscountAmount: number;
  offerId: string | null;
  offerName: string | null;
  offerCode: string | null;
  offerDiscountType: AppliedOffer['discount_type'] | null;
  deliveryCharge: number;
  discount: number;
  finalPrice: number;
  grandTotal: number;
  total: number;
  appliedCoupon: AppliedCoupon | null;
  appliedOffer: AppliedOffer | null;
}

export const CART_STORAGE_KEY = 'flux3d-cart';

export function getAnonymousCartKey(): string {
  if (typeof window === 'undefined') return `${CART_STORAGE_KEY}_anon`;
  const SESSION_KEY = 'flux3d-anon-session-id';
  let sessionId = window.localStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId =
      window.sessionStorage.getItem(SESSION_KEY) ??
      crypto.randomUUID?.() ??
      Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    window.localStorage.setItem(SESSION_KEY, sessionId);
  }
  return `${CART_STORAGE_KEY}_anon_${sessionId}`;
}
