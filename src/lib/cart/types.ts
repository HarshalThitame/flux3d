import { type QuoteConfig } from '@/lib/quote/types';

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
  postProcessingCharges?: number;
  estimatedTime?: number;
  weight?: number;
  dimensions?: {
    x: number;
    y: number;
    z: number;
  };
  config?: QuoteConfig;
  addedAt?: string;
}

export type CartOrderItem = {
  quoteId?: string;
  fileUrl?: string;
  fileName?: string;
  material: string;
  color: string;
  infill: number;
  layerHeight: number;
  supports: boolean;
  postProcessingCharges?: number;
  price: number;
  estimatedTime: number;
  weight: number;
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
}

export type CartSummary = {
  items: CartItem[];
  itemCount: number;
  subtotal: number;
  deliveryCharge: number;
  discount: number;
  total: number;
  appliedCoupon: AppliedCoupon | null;
}

export const CART_STORAGE_KEY = 'flux3d-cart';

export function getAnonymousCartKey(): string {
  if (typeof window === 'undefined') return `${CART_STORAGE_KEY}_anon`;
  const SESSION_KEY = 'flux3d-anon-session-id';
  let sessionId = window.sessionStorage.getItem(SESSION_KEY);
  if (!sessionId) {
    sessionId = crypto.randomUUID?.() ?? Math.random().toString(36).substring(2, 15) + Date.now().toString(36);
    window.sessionStorage.setItem(SESSION_KEY, sessionId);
  }
  return `${CART_STORAGE_KEY}_anon_${sessionId}`;
}
